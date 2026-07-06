-- ============================================================================
-- Lista de Compras (reposição de estoque)
-- ----------------------------------------------------------------------------
-- Lista prática de reposição para a equipe: mostra Item, Quantidade a comprar
-- e Quem inseriu. Duas origens:
--   • 'sistema' — inserido automaticamente quando o saldo total do produto fica
--     menor ou igual ao estoque mínimo. "Quem inseriu" = "Sistema".
--   • 'manual'  — inserido por um usuário autenticado. "Quem inseriu" = nome do
--     usuário logado.
-- Regra: quando o produto volta a ficar acima do mínimo NÃO removemos nada
-- automaticamente — o item só sai da lista quando alguém o marca como comprado
-- ou o remove.
-- Depende de 0001_inventory_schema.sql, 0004_stock_module.sql e
-- 0005_stock_sectors_and_quick_withdraw.sql.
-- ============================================================================

-- ── 1. Tabela da lista ───────────────────────────────────────────────────────
create table if not exists public.stock_shopping_list (
  id              uuid primary key default gen_random_uuid(),
  -- Vínculo opcional com o catálogo (itens do 'sistema' sempre têm produto;
  -- itens manuais podem ser texto livre). ON DELETE SET NULL preserva a linha.
  product_id      uuid references public.stock_products(id) on delete set null,
  item_name       text not null,
  quantity_to_buy numeric(12,2) not null default 0 check (quantity_to_buy >= 0),
  source          text not null default 'manual' check (source in ('sistema', 'manual')),
  status          text not null default 'pendente' check (status in ('pendente', 'comprado')),
  added_by        uuid references public.users_internal(id),
  added_by_name   text not null,
  created_at      timestamp not null default now(),
  updated_at      timestamp not null default now(),
  resolved_at     timestamp
);

-- Evita duplicar o item automático de um mesmo produto enquanto ele está pendente.
create unique index if not exists idx_shopping_list_pending_system
  on public.stock_shopping_list (product_id)
  where source = 'sistema' and status = 'pendente';

create index if not exists idx_shopping_list_status  on public.stock_shopping_list (status);
create index if not exists idx_shopping_list_product on public.stock_shopping_list (product_id);

-- ── 2. updated_at ────────────────────────────────────────────────────────────
drop trigger if exists touch_stock_shopping_list_updated_at on public.stock_shopping_list;
create trigger touch_stock_shopping_list_updated_at
before update on public.stock_shopping_list
for each row execute function public.touch_updated_at();

-- ── 3. Reavaliação automática (saldo <= mínimo → entra na lista) ─────────────
-- Idempotente: só cria um item 'sistema' pendente se ainda não houver NENHUM
-- item pendente (manual ou sistema) para o produto — evita duplicar a linha.
create or replace function public.stock_refresh_shopping_list(p_product_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_name    text;
  v_min     numeric;
  v_active  boolean;
  v_total   numeric;
  v_suggest numeric;
begin
  select name, min_quantity, active
    into v_name, v_min, v_active
    from public.stock_products
    where id = p_product_id;

  -- Produto inexistente/inativo ou sem mínimo definido: nada a fazer.
  if v_name is null or not v_active or v_min is null or v_min <= 0 then
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

  -- Sugestão: quanto falta para repor o mínimo; se já está exatamente no
  -- mínimo, sugere comprar o próprio mínimo.
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

-- ── 4. Gatilhos que disparam a reavaliação ──────────────────────────────────
-- Toda escrita em stock_levels passa por apply_stock_movement; reavaliamos o
-- produto afetado após cada mudança de saldo.
create or replace function public.stock_levels_shopping_trigger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  perform public.stock_refresh_shopping_list(new.product_id);
  return new;
end;
$function$;

drop trigger if exists trg_stock_levels_shopping on public.stock_levels;
create trigger trg_stock_levels_shopping
after insert or update of quantity on public.stock_levels
for each row execute function public.stock_levels_shopping_trigger();

-- Se o admin aumentar o estoque mínimo, o produto pode passar a ficar abaixo
-- dele sem que o saldo tenha mudado — reavaliamos também nesse caso.
create or replace function public.stock_products_shopping_trigger()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  perform public.stock_refresh_shopping_list(new.id);
  return new;
end;
$function$;

drop trigger if exists trg_stock_products_shopping on public.stock_products;
create trigger trg_stock_products_shopping
after update of min_quantity on public.stock_products
for each row execute function public.stock_products_shopping_trigger();

-- ── 5. Semeia a lista com os produtos já abaixo do mínimo hoje ───────────────
do $seed$
declare
  r record;
begin
  for r in
    select id from public.stock_products where active and min_quantity > 0
  loop
    perform public.stock_refresh_shopping_list(r.id);
  end loop;
end;
$seed$;

-- ── 6. Segurança (deny-by-default; o app acessa via service role) ────────────
alter table public.stock_shopping_list enable row level security;
revoke all on public.stock_shopping_list from anon, authenticated;
revoke all on function public.stock_refresh_shopping_list(uuid)   from anon, authenticated;
revoke all on function public.stock_levels_shopping_trigger()     from anon, authenticated;
revoke all on function public.stock_products_shopping_trigger()   from anon, authenticated;
