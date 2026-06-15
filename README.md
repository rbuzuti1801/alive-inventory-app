# Alive Church Inventory

Webapp interno para controle de bens da Alive Church, com autenticação própria por usuário/senha, permissões por papel e banco PostgreSQL no Supabase.

## Setup

1. Copie `.env.example` para `.env.local`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET`.
3. Rode a migration SQL em `supabase/migrations/0001_inventory_schema.sql` no Supabase.
4. Instale dependências com `npm install`.
5. Crie o primeiro admin com `npm run seed:admin`.
6. Inicie com `npm run dev`.

O app não possui cadastro público. Usuários internos são criados apenas por administradores.
