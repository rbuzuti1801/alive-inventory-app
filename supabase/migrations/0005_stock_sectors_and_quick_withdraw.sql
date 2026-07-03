-- ============================================================================
-- Ajustes do módulo de Estoque: setores reais como localizações + retirada
-- rápida sem login.
-- ----------------------------------------------------------------------------
-- 1. "Localização do estoque" e "destino da movimentação" são os MESMOS setores
--    já cadastrados no módulo de Patrimônio (Estoque, Templo, Cozinha...).
--    Espelhamos cada setor ativo em stock_locations para que os selects nunca
--    apareçam vazios e usem os setores reais da igreja — sem criar estrutura
--    nova. stock_levels/stock_movements continuam referenciando stock_locations.
-- 2. Retirada rápida (voluntário sem login): registrada como 'saida' com o nome
--    do responsável e a marca de que foi feita sem autenticação.
-- Depende de 0001_inventory_schema.sql e 0004_stock_module.sql.
-- ============================================================================

-- ── 1. Espelha setores ativos como localizações de estoque ──────────────────
insert into public.stock_locations (name, description, sector_id)
select s.name, s.description, s.id
from public.sectors s
where s.active
on conflict (name) do update
  set sector_id  = excluded.sector_id,
      active     = true;

-- ── 2. Rastreio da retirada sem autenticação ────────────────────────────────
alter table public.stock_movements
  add column if not exists performed_by_name text,
  add column if not exists unauthenticated   boolean not null default false;

-- ── 3. Movimentação atômica: Saída passa a exigir/registrar Destino e a
--       aceitar responsável informado + marca de retirada sem login ──────────
-- A assinatura ganhou 2 parâmetros; como isso é uma sobrecarga (não um replace),
-- removemos a versão antiga de 7 args para evitar ambiguidade na chamada RPC.
drop function if exists public.apply_stock_movement(uuid, text, numeric, uuid, uuid, text, uuid);

create or replace function public.apply_stock_movement(
  p_product_id       uuid,
  p_movement_type    text,
  p_quantity         numeric,
  p_from_location_id uuid    default null,
  p_to_location_id   uuid    default null,
  p_reason           text    default null,
  p_user_id          uuid    default null,
  p_performed_by_name text   default null,
  p_unauthenticated  boolean default false
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
  if p_movement_type = 'saida' then
    if p_from_location_id is null then
      raise exception 'Saída exige a localização de origem.';
    end if;
    if p_to_location_id is null then
      raise exception 'Saída exige o destino do material.';
    end if;
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

  -- Crédito (entrada / transferencia). Saída NÃO credita o destino: o destino
  -- é apenas o registro de para onde o material foi levado.
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
     previous_quantity, reason, moved_by, performed_by_name, unauthenticated)
  values
    (p_product_id, p_movement_type, p_quantity, p_from_location_id, p_to_location_id,
     v_previous, p_reason, p_user_id, p_performed_by_name, coalesce(p_unauthenticated, false))
  returning id into v_movement_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'from_balance', v_from_balance,
    'to_balance', v_to_balance
  );
end;
$function$;

revoke all on function public.apply_stock_movement(uuid, text, numeric, uuid, uuid, text, uuid, text, boolean)
  from anon, authenticated;
