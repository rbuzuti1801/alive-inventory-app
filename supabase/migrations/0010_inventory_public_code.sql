-- ============================================================================
-- Identidade pública do Patrimônio (public_code "B-")
-- ----------------------------------------------------------------------------
-- Dá ao bem patrimonial o mesmo modelo de identidade pública do Estoque:
-- inventory_items.public_code ("B-" + 10 hex aleatórios), gravado na URL do
-- QR Code (/p/{public_code}). A câmera nativa do celular abre a página de
-- CONSULTA do item (sem login = somente leitura; logado = ações por permissão).
--
-- O SKU (A-SETOR-SUB-00000) e o id do item NÃO mudam — apenas ganham um código
-- público opaco e estável para o link do QR. Prefixo reservado desde 0004.
-- Depende de 0001_inventory_schema.sql (pgcrypto) e 0002_qr_patrimonial.sql.
-- ============================================================================

-- ── 1. Coluna public_code ────────────────────────────────────────────────────
alter table public.inventory_items
  add column if not exists public_code text;

-- Backfill: um código por item já cadastrado (gen_random_bytes é avaliado por
-- linha, gerando valores distintos).
update public.inventory_items
set public_code = 'B-' || encode(gen_random_bytes(5), 'hex')
where public_code is null;

-- Default para novos itens + obrigatoriedade + unicidade.
alter table public.inventory_items
  alter column public_code set default 'B-' || encode(gen_random_bytes(5), 'hex');

alter table public.inventory_items
  alter column public_code set not null;

create unique index if not exists idx_inventory_items_public_code
  on public.inventory_items(public_code);
