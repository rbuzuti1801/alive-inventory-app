-- ============================================================================
-- Módulo de Identificação Patrimonial por QR Code
-- ----------------------------------------------------------------------------
-- Adiciona: dados de QR Code, controle de etiquetas, histórico de leituras
-- (scans) e sessões de inventário por escaneamento (auditoria patrimonial).
-- Depende de 0001_inventory_schema.sql.
-- ============================================================================

-- ── 1. Novas colunas em inventory_items ─────────────────────────────────────
alter table public.inventory_items
  add column if not exists qr_code_data   jsonb,
  add column if not exists label_type     text not null default 'compacta',
  add column if not exists label_printed  boolean not null default false,
  add column if not exists label_printed_at timestamp,
  add column if not exists last_scan_at   timestamp,
  add column if not exists last_scan_by   uuid references public.users_internal(id);

-- Restringe os modelos de etiqueta aos três oficiais (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inventory_items_label_type_check'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_label_type_check
      check (label_type in ('compacta', 'media', 'completa'));
  end if;
end $$;

-- ── 2. Sessões de auditoria / inventário por escaneamento ────────────────────
create table if not exists public.inventory_audits (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  status         text not null default 'em_andamento' check (status in ('em_andamento', 'finalizado')),
  sector_id      uuid references public.sectors(id),
  started_by     uuid references public.users_internal(id),
  started_at     timestamp not null default now(),
  finished_at    timestamp,
  total_expected integer not null default 0,
  total_found    integer not null default 0,
  notes          text,
  created_at     timestamp not null default now(),
  updated_at     timestamp not null default now()
);

-- Itens confirmados (encontrados) dentro de uma auditoria.
create table if not exists public.audit_items (
  id         uuid primary key default gen_random_uuid(),
  audit_id   uuid not null references public.inventory_audits(id) on delete cascade,
  item_id    uuid not null references public.inventory_items(id) on delete cascade,
  found      boolean not null default true,
  scanned_by uuid references public.users_internal(id),
  scanned_at timestamp not null default now(),
  unique (audit_id, item_id)
);

-- ── 3. Histórico de leituras (scans) ─────────────────────────────────────────
create table if not exists public.inventory_scans (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.inventory_items(id) on delete cascade,
  scanned_by uuid references public.users_internal(id),
  scanned_at timestamp not null default now(),
  context    text not null default 'consulta' check (context in ('consulta', 'inventario', 'auditoria')),
  audit_id   uuid references public.inventory_audits(id) on delete set null
);

-- ── 4. Índices ───────────────────────────────────────────────────────────────
create index if not exists idx_inventory_items_label_printed on public.inventory_items(label_printed);
create index if not exists idx_inventory_items_last_scan      on public.inventory_items(last_scan_at);
create index if not exists idx_inventory_items_label_type     on public.inventory_items(label_type);
create index if not exists idx_inventory_scans_item   on public.inventory_scans(item_id);
create index if not exists idx_inventory_scans_audit  on public.inventory_scans(audit_id);
create index if not exists idx_inventory_scans_date   on public.inventory_scans(scanned_at desc);
create index if not exists idx_audit_items_audit      on public.audit_items(audit_id);
create index if not exists idx_audit_items_item       on public.audit_items(item_id);
create index if not exists idx_inventory_audits_status on public.inventory_audits(status);

-- ── 5. QR Code automático ────────────────────────────────────────────────────
-- O QR Code armazena { id (uuid), sku, name }. É gerado junto ao SKU e
-- mantido sincronizado quando a descrição muda (sem nunca alterar id/sku).
create or replace function public.generate_sku()
returns trigger as $function$
declare
  v_sector_code text;
  v_sub_code    text;
  v_next_seq    integer;
begin
  select code into v_sector_code
    from public.sectors where id = new.sector_id;

  if v_sector_code is null then
    raise exception 'Setor não encontrado ou sem código definido.';
  end if;

  if new.subcategory_id is not null then
    select code into v_sub_code
      from public.subcategories where id = new.subcategory_id;
  end if;

  if v_sub_code is null then
    v_sub_code := 'GER';
  end if;

  insert into public.sku_sequences (sector_code, sub_code, last_seq)
  values (v_sector_code, v_sub_code, 1)
  on conflict (sector_code, sub_code) do update
    set last_seq = sku_sequences.last_seq + 1
  returning last_seq into v_next_seq;

  new.sku       := 'A-' || v_sector_code || '-' || v_sub_code || '-' || lpad(v_next_seq::text, 5, '0');
  new.item_code := new.sku;

  -- Conteúdo do QR Code patrimonial
  new.qr_code_data := jsonb_build_object('id', new.id, 'sku', new.sku, 'name', new.description);

  return new;
end;
$function$ language plpgsql;

create or replace function public.protect_sku()
returns trigger as $function$
begin
  if old.sku is not null then
    new.sku       := old.sku;
    new.item_code := old.item_code;
    -- Mantém id/sku, mas atualiza o nome no QR caso a descrição mude.
    new.qr_code_data := jsonb_build_object('id', old.id, 'sku', old.sku, 'name', new.description);
  end if;
  return new;
end;
$function$ language plpgsql;

-- ── 6. updated_at em inventory_audits ────────────────────────────────────────
drop trigger if exists touch_inventory_audits_updated_at on public.inventory_audits;
create trigger touch_inventory_audits_updated_at
before update on public.inventory_audits
for each row execute function public.touch_updated_at();

-- ── 7. Segurança (deny-by-default; o app acessa via service role) ────────────
alter table public.inventory_audits enable row level security;
alter table public.audit_items      enable row level security;
alter table public.inventory_scans  enable row level security;
alter table public.sku_sequences    enable row level security;

revoke all on public.inventory_audits from anon, authenticated;
revoke all on public.audit_items      from anon, authenticated;
revoke all on public.inventory_scans  from anon, authenticated;
revoke all on public.sku_sequences    from anon, authenticated;

-- ── 8. Backfill dos itens já cadastrados ─────────────────────────────────────
update public.inventory_items
set qr_code_data = jsonb_build_object('id', id, 'sku', coalesce(sku, item_code), 'name', description)
where qr_code_data is null;
