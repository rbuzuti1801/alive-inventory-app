-- ============================================================================
-- Solicitação de Compra (purchase_requests)
-- ----------------------------------------------------------------------------
-- Formulário PÚBLICO (sem login): qualquer pessoa com o link envia uma
-- solicitação, que nasce com status 'pendente' e um número legível
-- (SC-{ANO}-{0000}). A triagem (aprovar / rejeitar / cancelar) é feita por
-- admin ou responsável na área interna.
--
-- Independente da Lista de Compras (stock_shopping_list): NÃO há integração —
-- aprovar uma solicitação não cria item de reposição de estoque.
--
-- O número usa uma sequência global com o ano no prefixo (não reinicia por
-- ano): o prefixo é informativo e a sequência garante unicidade sem depender
-- de leitura da tabela (sem corrida entre envios simultâneos).
-- Depende de 0001_inventory_schema.sql (pgcrypto, users_internal,
-- touch_updated_at).
-- ============================================================================

-- ── 1. Sequência do número da solicitação ───────────────────────────────────
create sequence if not exists public.purchase_request_number_seq;

-- ── 2. Tabela ───────────────────────────────────────────────────────────────
create table if not exists public.purchase_requests (
  id                uuid primary key default gen_random_uuid(),
  request_number    text not null unique
                    default 'SC-' || to_char(now(), 'YYYY') || '-'
                            || lpad(nextval('public.purchase_request_number_seq')::text, 4, '0'),

  -- Obrigatórios do formulário público
  requester_name    text not null,
  requester_contact text not null,
  item_name         text not null,
  quantity          numeric(12,2) not null check (quantity > 0),
  justification     text not null,

  -- Opcionais
  department        text,
  estimated_value   numeric(12,2) check (estimated_value >= 0),
  brand             text,
  reference_link    text,
  desired_date      date,
  observations      text,

  -- Triagem interna
  status            text not null default 'pendente'
                    check (status in ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  approved_quantity numeric(12,2) check (approved_quantity >= 0),
  approved_value    numeric(12,2) check (approved_value >= 0),
  approved_brand    text,
  decision_notes    text,
  decided_by        uuid references public.users_internal(id),
  decided_by_name   text,
  decided_at        timestamp,

  created_at        timestamp not null default now(),
  updated_at        timestamp not null default now()
);

create index if not exists idx_purchase_requests_status     on public.purchase_requests (status);
create index if not exists idx_purchase_requests_created_at on public.purchase_requests (created_at desc);

-- ── 3. updated_at ───────────────────────────────────────────────────────────
drop trigger if exists touch_purchase_requests_updated_at on public.purchase_requests;
create trigger touch_purchase_requests_updated_at
before update on public.purchase_requests
for each row execute function public.touch_updated_at();

-- ── 4. Segurança (deny-by-default; o app acessa via service role) ───────────
alter table public.purchase_requests enable row level security;
revoke all on public.purchase_requests from anon, authenticated;
revoke all on sequence public.purchase_request_number_seq from anon, authenticated;
