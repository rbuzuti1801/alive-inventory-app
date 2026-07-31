-- ============================================================================
-- Ordens de Serviço (service_orders)
-- ----------------------------------------------------------------------------
-- Módulo INTERNO (admin e responsável): a Ordem de Serviço é apenas um
-- DOCUMENTO para impressão e assinatura física — não é contrato eletrônico,
-- não movimenta estoque e não gera lançamento financeiro.
--
-- Ciclo: rascunho → emitida → em_execucao → concluida (cancelamento possível
-- em qualquer estado não final). O NÚMERO (OS-{ANO}-{0000}) só é atribuído na
-- EMISSÃO e, depois disso, é definitivo (protegido por trigger, como o SKU do
-- patrimônio). Edição de conteúdo só é permitida enquanto é rascunho.
--
-- Todos os dados do prestador são opcionais: quando ausentes, o PDF imprime o
-- espaço em branco para preenchimento manual.
-- Depende de 0001_inventory_schema.sql (pgcrypto, users_internal,
-- touch_updated_at).
-- ============================================================================

-- ── 1. Sequência do número da ordem ─────────────────────────────────────────
create sequence if not exists public.service_order_number_seq;

-- ── 2. Tabela principal ─────────────────────────────────────────────────────
create table if not exists public.service_orders (
  id                  uuid primary key default gen_random_uuid(),
  -- Nulo enquanto rascunho; preenchido na emissão e imutável depois.
  order_number        text unique,
  status              text not null default 'rascunho'
                      check (status in ('rascunho', 'emitida', 'em_execucao', 'concluida', 'cancelada')),

  -- Identificação
  responsible_name    text not null,
  department          text,

  -- Serviço
  title               text not null,
  description         text not null,
  service_location    text,
  start_date          date,
  end_date            date,
  service_value       numeric(12,2) check (service_value >= 0),
  payment_method      text,
  materials_included  text,
  materials_excluded  text,
  warranty            text,
  observations        text,

  -- Prestador (todos opcionais)
  provider_name       text,
  provider_document   text,
  provider_phone      text,
  provider_email      text,
  provider_address    text,
  provider_contact    text,

  -- Emissão e autoria
  issued_at           timestamp,
  issued_by           uuid references public.users_internal(id),
  issued_by_name      text,
  created_by          uuid references public.users_internal(id),
  created_by_name     text,

  created_at          timestamp not null default now(),
  updated_at          timestamp not null default now()
);

create index if not exists idx_service_orders_status     on public.service_orders (status);
create index if not exists idx_service_orders_created_at on public.service_orders (created_at desc);

-- ── 3. Histórico do documento ───────────────────────────────────────────────
create table if not exists public.service_order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.service_orders(id) on delete cascade,
  event_type  text not null,
  from_status text,
  to_status   text,
  notes       text,
  user_id     uuid references public.users_internal(id),
  user_name   text not null,
  created_at  timestamp not null default now()
);

create index if not exists idx_service_order_events_order on public.service_order_events (order_id, created_at);

-- ── 4. updated_at ───────────────────────────────────────────────────────────
drop trigger if exists touch_service_orders_updated_at on public.service_orders;
create trigger touch_service_orders_updated_at
before update on public.service_orders
for each row execute function public.touch_updated_at();

-- ── 5. Número definitivo após a emissão ─────────────────────────────────────
create or replace function public.protect_service_order_number()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if old.order_number is not null and new.order_number is distinct from old.order_number then
    raise exception 'O número da ordem de serviço é definitivo e não pode ser alterado.';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_service_order_number on public.service_orders;
create trigger protect_service_order_number
before update on public.service_orders
for each row execute function public.protect_service_order_number();

-- ── 6. Transição de status (atômica: status + número + histórico) ───────────
-- Única porta de mudança de status. Valida a transição, atribui o número na
-- emissão e registra o evento no histórico na MESMA transação.
create or replace function public.set_service_order_status(
  p_order_id  uuid,
  p_status    text,
  p_user_id   uuid,
  p_user_name text,
  p_notes     text default null
)
returns public.service_orders
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_order public.service_orders;
  v_from  text;
begin
  select * into v_order from public.service_orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'Ordem de serviço não encontrada.';
  end if;

  v_from := v_order.status;

  if v_from = p_status then
    raise exception 'A ordem de serviço já está neste status.';
  end if;

  -- Transições permitidas.
  if not (
       (v_from = 'rascunho'    and p_status in ('emitida', 'cancelada'))
    or (v_from = 'emitida'     and p_status in ('em_execucao', 'concluida', 'cancelada'))
    or (v_from = 'em_execucao' and p_status in ('concluida', 'cancelada'))
  ) then
    raise exception 'Transição de status não permitida (% → %).', v_from, p_status;
  end if;

  if p_status = 'emitida' then
    update public.service_orders
       set status         = 'emitida',
           order_number   = coalesce(order_number,
                              'OS-' || to_char(now(), 'YYYY') || '-'
                              || lpad(nextval('public.service_order_number_seq')::text, 4, '0')),
           issued_at      = coalesce(issued_at, now()),
           issued_by      = coalesce(issued_by, p_user_id),
           issued_by_name = coalesce(issued_by_name, p_user_name)
     where id = p_order_id
     returning * into v_order;
  else
    update public.service_orders
       set status = p_status
     where id = p_order_id
     returning * into v_order;
  end if;

  insert into public.service_order_events (order_id, event_type, from_status, to_status, notes, user_id, user_name)
  values (p_order_id, 'status', v_from, p_status, p_notes, p_user_id, p_user_name);

  return v_order;
end;
$function$;

-- ── 7. Segurança (deny-by-default; o app acessa via service role) ───────────
alter table public.service_orders       enable row level security;
alter table public.service_order_events enable row level security;
revoke all on public.service_orders       from anon, authenticated;
revoke all on public.service_order_events from anon, authenticated;
revoke all on sequence public.service_order_number_seq from anon, authenticated;
revoke all on function public.protect_service_order_number()                          from anon, authenticated;
revoke all on function public.set_service_order_status(uuid, text, uuid, text, text)  from anon, authenticated;
