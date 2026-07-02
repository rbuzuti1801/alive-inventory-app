-- ============================================================================
-- [RECUPERADA] SKU patrimonial: coluna sku, sequências e triggers
-- ----------------------------------------------------------------------------
-- Migration aplicada em produção como 20260615152952_add_sku_to_inventory_items,
-- reconstruída a partir do schema real para o repositório voltar a ser
-- replayável do zero. Depende de 0001b_add_sku_codes_to_taxonomy.sql.
-- As funções abaixo são as versões PRÉ-QR; 0002_qr_patrimonial.sql faz
-- "create or replace" adicionando a sincronização de qr_code_data.
-- ============================================================================

-- ── 1. Coluna sku (única) em inventory_items ────────────────────────────────
alter table public.inventory_items
  add column if not exists sku text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inventory_items_sku_key'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_sku_key unique (sku);
  end if;
end $$;

-- ── 2. Sequências por (setor, subcategoria) para o número do SKU ────────────
create table if not exists public.sku_sequences (
  sector_code text not null,
  sub_code    text not null,
  last_seq    integer not null default 0,
  primary key (sector_code, sub_code)
);

alter table public.sku_sequences enable row level security;
revoke all on public.sku_sequences from anon, authenticated;

-- ── 3. Geração e proteção do SKU ─────────────────────────────────────────────
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

  return new;
end;
$function$ language plpgsql;

create or replace function public.protect_sku()
returns trigger as $function$
begin
  if old.sku is not null then
    new.sku       := old.sku;
    new.item_code := old.item_code;
  end if;
  return new;
end;
$function$ language plpgsql;

drop trigger if exists set_sku_on_insert on public.inventory_items;
create trigger set_sku_on_insert
before insert on public.inventory_items
for each row execute function public.generate_sku();

drop trigger if exists protect_sku_on_update on public.inventory_items;
create trigger protect_sku_on_update
before update on public.inventory_items
for each row execute function public.protect_sku();
