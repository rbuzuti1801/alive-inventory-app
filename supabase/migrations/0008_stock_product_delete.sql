-- ── 0008: exclusão de produto de estoque ────────────────────────────────────
-- Regra nova: produto ativo não pode ser excluído (desative antes); produto
-- desativado pode ser excluído pelo admin.
--
-- O vínculo stock_movements.product_id é NO ACTION: o banco recusa apagar um
-- produto que tenha histórico. Apagar as movimentações junto destruiria a
-- auditoria, então a exclusão tem dois caminhos:
--
--   sem histórico  -> exclusão FÍSICA (nada a preservar; stock_levels cascateia)
--   com histórico  -> exclusão LÓGICA (deleted_at): some de todas as listagens,
--                     mas as movimentações continuam íntegras e legíveis.
--
-- Em ambos os casos os saldos (stock_levels) são removidos: o produto sai de
-- operação e não pode continuar somando nos totais por localização.

alter table public.stock_products add column if not exists deleted_at timestamp;

-- Listagens filtram por "não excluído"; índice parcial cobre o caso comum.
create index if not exists stock_products_not_deleted_idx
  on public.stock_products (deleted_at) where deleted_at is null;

create or replace function public.delete_stock_product(
  p_product_id uuid,
  p_user_id    uuid default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_product   record;
  v_movements integer;
begin
  select id, name, active, deleted_at into v_product
    from public.stock_products where id = p_product_id;

  if v_product.id is null or v_product.deleted_at is not null then
    raise exception 'Produto não encontrado.';
  end if;

  -- Guarda central da nova regra.
  if v_product.active then
    raise exception 'Desative o produto antes de excluí-lo.';
  end if;

  select count(*) into v_movements
    from public.stock_movements where product_id = p_product_id;

  -- Saldos saem nos dois caminhos: sem isso um produto arquivado continuaria
  -- somando no total da localização.
  delete from public.stock_levels where product_id = p_product_id;

  -- Itens pendentes da lista de compras perdem o sentido; os já comprados
  -- ficam (o vínculo é SET NULL e item_name é denormalizado).
  delete from public.stock_shopping_list
    where product_id = p_product_id and status = 'pendente';

  if v_movements = 0 then
    delete from public.stock_products where id = p_product_id;
    return jsonb_build_object('mode', 'permanente', 'movements', 0);
  end if;

  update public.stock_products
     set deleted_at = now(), updated_at = now()
   where id = p_product_id;

  return jsonb_build_object('mode', 'arquivado', 'movements', v_movements);
end;
$function$;

revoke all on function public.delete_stock_product(uuid, uuid) from anon, authenticated;

-- A lista de compras nunca deve ressuscitar um produto excluído logicamente.
-- Cópia fiel da versão de 0006: a ÚNICA mudança é ler deleted_at e incluí-lo na
-- guarda de saída. O resto (limiar v_total > v_min, sugestão, on conflict do
-- nothing) é preservado para não alterar o comportamento da lista.
create or replace function public.stock_refresh_shopping_list(p_product_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_name    text;
  v_min     numeric;
  v_active  boolean;
  v_deleted timestamp;
  v_total   numeric;
  v_suggest numeric;
begin
  select name, min_quantity, active, deleted_at
    into v_name, v_min, v_active, v_deleted
    from public.stock_products
    where id = p_product_id;

  -- Produto inexistente/inativo/excluído ou sem mínimo definido: nada a fazer.
  if v_name is null or v_deleted is not null or not v_active or v_min is null or v_min <= 0 then
    return;
  end if;

  select coalesce(sum(quantity), 0)
    into v_total
    from public.stock_levels
    where product_id = p_product_id;

  if v_total > v_min then
    return;
  end if;

  -- Já existe item pendente para o produto: não duplica.
  if exists (
    select 1 from public.stock_shopping_list
    where product_id = p_product_id and status = 'pendente'
  ) then
    return;
  end if;

  v_suggest := v_min - v_total;
  if v_suggest <= 0 then
    v_suggest := v_min;
  end if;

  insert into public.stock_shopping_list
    (product_id, item_name, quantity_to_buy, source, added_by_name)
  values
    (p_product_id, v_name, v_suggest, 'sistema', 'Sistema')
  on conflict (product_id) where (source = 'sistema' and status = 'pendente')
    do nothing;
end;
$function$;

revoke all on function public.stock_refresh_shopping_list(uuid) from anon, authenticated;
