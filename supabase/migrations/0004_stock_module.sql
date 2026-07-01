-- ============================================================================
-- Módulo de Estoque de Consumíveis
-- ----------------------------------------------------------------------------
-- Módulo independente do patrimônio: produtos de consumo recorrente (água,
-- café, descartáveis, limpeza...) controlados por QUANTIDADE em múltiplas
-- localizações físicas, com histórico imutável de movimentações.
--
-- Identidade pública: stock_products.public_code ("E-" + 10 hex aleatórios),
-- usado na URL do QR Code (/p/{public_code}). Prefixos reservados para o
-- futuro: "B-" (bem patrimonial), "L-" (localização).
-- Depende de 0001_inventory_schema.sql (pgcrypto, sectors, users_internal,
-- touch_updated_at).
-- ============================================================================

-- ── 1. Localizações físicas (prateleira, armário, sala) ─────────────────────
-- Sem QR próprio: o QR identifica o PRODUTO; localização é atributo do saldo.
create table if not exists public.stock_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  sector_id   uuid references public.sectors(id),
  active      boolean not null default true,
  created_at  timestamp not null default now(),
  updated_at  timestamp not null default now()
);

-- ── 2. Catálogo de produtos consumíveis ──────────────────────────────────────
create table if not exists public.stock_products (
  id               uuid primary key default gen_random_uuid(),
  public_code      text not null unique
                   default 'E-' || encode(gen_random_bytes(5), 'hex'),
  name             text not null,
  category         text not null default 'outros'
                   check (category in ('alimentos_bebidas', 'descartaveis', 'limpeza', 'higiene',
                                       'escritorio', 'kids', 'manutencao', 'outros')),
  unit             text not null default 'un'
                   check (unit in ('un', 'cx', 'pct', 'fardo', 'rolo', 'lt', 'kg', 'gl', 'par')),
  min_quantity     numeric(12,2) not null default 0,
  barcode          text,
  notes            text,
  label_printed    boolean not null default false,
  label_printed_at timestamp,
  active           boolean not null default true,
  created_by       uuid references public.users_internal(id),
  created_at       timestamp not null default now(),
  updated_at       timestamp not null default now()
);

-- ── 3. Saldo por produto × localização (mantido SOMENTE pela RPC) ────────────
create table if not exists public.stock_levels (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.stock_products(id) on delete cascade,
  location_id uuid not null references public.stock_locations(id) on delete cascade,
  quantity    numeric(12,2) not null default 0 check (quantity >= 0),
  updated_at  timestamp not null default now(),
  unique (product_id, location_id)
);

-- ── 4. Histórico imutável de movimentações ──────────────────────────────────
-- entrada: to_location · saida: from_location · transferencia: ambos
-- ajuste: to_location (quantity = saldo absoluto contado; previous_quantity = anterior)
create table if not exists public.stock_movements (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.stock_products(id),
  movement_type     text not null
                    check (movement_type in ('entrada', 'saida', 'ajuste', 'transferencia')),
  quantity          numeric(12,2) not null check (quantity >= 0),
  from_location_id  uuid references public.stock_locations(id),
  to_location_id    uuid references public.stock_locations(id),
  previous_quantity numeric(12,2),
  reason            text,
  moved_by          uuid references public.users_internal(id),
  moved_at          timestamp not null default now()
);

-- ── 5. Índices ───────────────────────────────────────────────────────────────
create index if not exists idx_stock_levels_product     on public.stock_levels(product_id);
create index if not exists idx_stock_levels_location    on public.stock_levels(location_id);
create index if not exists idx_stock_movements_product  on public.stock_movements(product_id, moved_at desc);
create index if not exists idx_stock_movements_date     on public.stock_movements(moved_at desc);
create index if not exists idx_stock_products_active    on public.stock_products(active);
create index if not exists idx_stock_locations_active   on public.stock_locations(active);

-- ── 6. updated_at ────────────────────────────────────────────────────────────
drop trigger if exists touch_stock_locations_updated_at on public.stock_locations;
create trigger touch_stock_locations_updated_at
before update on public.stock_locations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_stock_products_updated_at on public.stock_products;
create trigger touch_stock_products_updated_at
before update on public.stock_products
for each row execute function public.touch_updated_at();

drop trigger if exists touch_stock_levels_updated_at on public.stock_levels;
create trigger touch_stock_levels_updated_at
before update on public.stock_levels
for each row execute function public.touch_updated_at();

-- ── 7. Movimentação atômica ──────────────────────────────────────────────────
-- Única porta de escrita em stock_levels/stock_movements. Chamada pelo app via
-- supabaseAdmin.rpc('apply_stock_movement', ...). Mensagens de erro em PT-BR
-- sobem até a UI via errorResponse().
create or replace function public.apply_stock_movement(
  p_product_id       uuid,
  p_movement_type    text,
  p_quantity         numeric,
  p_from_location_id uuid default null,
  p_to_location_id   uuid default null,
  p_reason           text default null,
  p_user_id          uuid default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_product      record;
  v_from_balance numeric;
  v_to_balance   numeric;
  v_previous     numeric;
  v_movement_id  uuid;
begin
  select id, active into v_product
    from public.stock_products where id = p_product_id;
  if v_product.id is null then
    raise exception 'Produto não encontrado.';
  end if;
  if not v_product.active then
    raise exception 'Produto inativo não pode ser movimentado.';
  end if;

  if p_movement_type not in ('entrada', 'saida', 'ajuste', 'transferencia') then
    raise exception 'Tipo de movimentação inválido.';
  end if;

  if p_movement_type = 'ajuste' then
    if p_quantity is null or p_quantity < 0 then
      raise exception 'Quantidade do ajuste não pode ser negativa.';
    end if;
  elsif p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  if p_movement_type = 'entrada' and p_to_location_id is null then
    raise exception 'Entrada exige a localização de destino.';
  end if;
  if p_movement_type = 'saida' and p_from_location_id is null then
    raise exception 'Saída exige a localização de origem.';
  end if;
  if p_movement_type = 'ajuste' and p_to_location_id is null then
    raise exception 'Ajuste exige a localização.';
  end if;
  if p_movement_type = 'transferencia' then
    if p_from_location_id is null or p_to_location_id is null then
      raise exception 'Transferência exige localização de origem e de destino.';
    end if;
    if p_from_location_id = p_to_location_id then
      raise exception 'Origem e destino da transferência devem ser diferentes.';
    end if;
  end if;

  if p_from_location_id is not null and not exists (
    select 1 from public.stock_locations where id = p_from_location_id and active
  ) then
    raise exception 'Localização de origem inválida ou inativa.';
  end if;
  if p_to_location_id is not null and not exists (
    select 1 from public.stock_locations where id = p_to_location_id and active
  ) then
    raise exception 'Localização de destino inválida ou inativa.';
  end if;

  -- Débito (saida / transferencia), com lock de linha.
  if p_movement_type in ('saida', 'transferencia') then
    select quantity into v_from_balance
      from public.stock_levels
      where product_id = p_product_id and location_id = p_from_location_id
      for update;
    if v_from_balance is null or v_from_balance < p_quantity then
      raise exception 'Saldo insuficiente na origem: disponível %, solicitado %.',
        coalesce(v_from_balance, 0), p_quantity;
    end if;
    update public.stock_levels
      set quantity = quantity - p_quantity
      where product_id = p_product_id and location_id = p_from_location_id
      returning quantity into v_from_balance;
  end if;

  -- Crédito (entrada / transferencia).
  if p_movement_type in ('entrada', 'transferencia') then
    insert into public.stock_levels (product_id, location_id, quantity)
    values (p_product_id, p_to_location_id, p_quantity)
    on conflict (product_id, location_id) do update
      set quantity = stock_levels.quantity + excluded.quantity
    returning quantity into v_to_balance;
  end if;

  -- Ajuste: define saldo absoluto e registra o anterior.
  if p_movement_type = 'ajuste' then
    select quantity into v_previous
      from public.stock_levels
      where product_id = p_product_id and location_id = p_to_location_id
      for update;
    insert into public.stock_levels (product_id, location_id, quantity)
    values (p_product_id, p_to_location_id, p_quantity)
    on conflict (product_id, location_id) do update
      set quantity = excluded.quantity
    returning quantity into v_to_balance;
  end if;

  insert into public.stock_movements
    (product_id, movement_type, quantity, from_location_id, to_location_id,
     previous_quantity, reason, moved_by)
  values
    (p_product_id, p_movement_type, p_quantity, p_from_location_id, p_to_location_id,
     v_previous, p_reason, p_user_id)
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'from_balance', v_from_balance,
    'to_balance', v_to_balance
  );
end;
$function$;

-- ── 8. Segurança (deny-by-default; o app acessa via service role) ────────────
alter table public.stock_locations enable row level security;
alter table public.stock_products  enable row level security;
alter table public.stock_levels    enable row level security;
alter table public.stock_movements enable row level security;

revoke all on public.stock_locations from anon, authenticated;
revoke all on public.stock_products  from anon, authenticated;
revoke all on public.stock_levels    from anon, authenticated;
revoke all on public.stock_movements from anon, authenticated;

revoke all on function public.apply_stock_movement(uuid, text, numeric, uuid, uuid, text, uuid)
  from anon, authenticated;
