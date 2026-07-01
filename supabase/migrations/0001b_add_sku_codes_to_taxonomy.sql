-- ============================================================================
-- [RECUPERADA] Códigos de SKU na taxonomia (setores e subcategorias)
-- ----------------------------------------------------------------------------
-- Migration aplicada em produção como 20260615152939_add_sku_codes_to_taxonomy,
-- reconstruída a partir do schema real para o repositório voltar a ser
-- replayável do zero. Depende de 0001_inventory_schema.sql.
-- ============================================================================

alter table public.sectors
  add column if not exists code text;

alter table public.subcategories
  add column if not exists code text;

-- Backfill dos códigos usados na composição do SKU (A-{SETOR}-{SUB}-00000).
-- Idempotente: só preenche onde ainda não há código.
update public.sectors set code = x.code
from (
  values
    ('Templo', 'TEM'),
    ('Hall de entrada', 'HAL'),
    ('Sala Ap. e Profeta', 'APR'),
    ('Cozinha', 'COZ'),
    ('Espaço Kids', 'KID'),
    ('Sala dos voluntários', 'VOL'),
    ('Estoque', 'EST')
) as x(name, code)
where sectors.name = x.name and sectors.code is null;

update public.subcategories set code = x.code
from public.sectors s,
(
  values
    ('Templo', 'Nave', 'NAV'),
    ('Templo', 'Altar', 'ALT'),
    ('Templo', 'Mídia', 'MID'),
    ('Templo', 'House música', 'HOU'),
    ('Hall de entrada', 'Espaço', 'ESP'),
    ('Hall de entrada', 'Café', 'CAF'),
    ('Hall de entrada', 'Banheiro', 'BAN'),
    ('Sala Ap. e Profeta', 'Banheiro', 'BAN'),
    ('Espaço Kids', 'Sala 01', 'S01'),
    ('Espaço Kids', 'Sala 02', 'S02'),
    ('Espaço Kids', 'Sala 03', 'S03'),
    ('Sala dos voluntários', 'Armário de voluntários', 'ARM'),
    ('Estoque', 'Estoque frente', 'FRE'),
    ('Estoque', 'Estoque fundo', 'FUN')
) as x(sector_name, name, code)
where s.name = x.sector_name
  and subcategories.sector_id = s.id
  and subcategories.name = x.name
  and subcategories.code is null;
