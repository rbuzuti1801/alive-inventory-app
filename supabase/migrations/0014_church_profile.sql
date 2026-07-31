-- ============================================================================
-- Perfil da Igreja (church_profile)
-- ----------------------------------------------------------------------------
-- Dados institucionais (razão social, CNPJ, endereço, contatos, logo) usados no
-- cabeçalho dos documentos impressos — hoje a Solicitação de Compra aprovada e
-- a Ordem de Serviço. Antes eram constantes/variáveis de ambiente; agora são
-- editáveis pelo admin na própria aplicação, sem redeploy.
--
-- Tabela SINGLETON: uma única linha, garantida pela coluna `singleton` (sempre
-- true + unique). Assim o app sempre lê/atualiza "o perfil", sem precisar
-- guardar um id em lugar nenhum.
-- Depende de 0001_inventory_schema.sql (pgcrypto, users_internal,
-- touch_updated_at).
-- ============================================================================

create table if not exists public.church_profile (
  id              uuid primary key default gen_random_uuid(),
  -- Trava de linha única: check garante o valor, unique garante a unicidade.
  singleton       boolean not null default true unique check (singleton),

  name            text not null default 'Alive Church',
  legal_name      text,
  document        text,
  address         text,
  phone           text,
  email           text,
  website         text,
  -- Caminho/URL do logo. Vazio usa o arquivo padrão servido pelo app.
  logo_url        text,

  updated_by      uuid references public.users_internal(id),
  updated_by_name text,
  created_at      timestamp not null default now(),
  updated_at      timestamp not null default now()
);

-- Linha inicial (idempotente).
insert into public.church_profile (name, legal_name)
select 'Alive Church', 'Alive Church Alphaville'
where not exists (select 1 from public.church_profile);

drop trigger if exists touch_church_profile_updated_at on public.church_profile;
create trigger touch_church_profile_updated_at
before update on public.church_profile
for each row execute function public.touch_updated_at();

alter table public.church_profile enable row level security;
revoke all on public.church_profile from anon, authenticated;
