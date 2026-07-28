-- ── 0011: origem da aquisição do bem patrimonial ────────────────────────────
-- Registra COMO o bem entrou no patrimônio (compra, doação ou outros). Campo
-- opcional: os itens já cadastrados ficam com origem nula até serem revisados,
-- por isso não há default nem not null (um default 'compra' inventaria uma
-- informação que ninguém confirmou).
--
-- acquisition_origin_detail complementa a opção "outros" (ex.: permuta,
-- transferência de outra unidade) — sem ele "outros" não diz nada.

alter table public.inventory_items
  add column if not exists acquisition_origin text,
  add column if not exists acquisition_origin_detail text;

alter table public.inventory_items
  drop constraint if exists inventory_items_acquisition_origin_check;

alter table public.inventory_items
  add constraint inventory_items_acquisition_origin_check
  check (acquisition_origin is null or acquisition_origin in ('compra', 'doacao', 'outros'));
