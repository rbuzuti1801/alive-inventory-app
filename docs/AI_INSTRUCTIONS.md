# AI_INSTRUCTIONS.md — Guia para agentes de IA neste projeto

> Documentação oficial. Leia este guia **e** o `PROJECT_CONTEXT.md` **antes** de qualquer implementação. Estes documentos são a fonte de verdade sobre arquitetura e funcionamento do sistema e reduzem a necessidade de reanalisar o código a cada tarefa.

---

## 1. Antes de implementar

1. **Analise a arquitetura existente primeiro.** Leia `PROJECT_CONTEXT.md` e os arquivos do núcleo (`lib/*`, `middleware.ts`) relevantes à tarefa. Entenda o padrão antes de escrever.
2. **Procure reutilizar** antes de criar. Provavelmente já existe: um helper (`lib/api.ts`), um schema (`lib/validators.ts`), uma constante/label (`lib/constants.ts`), uma função de permissão (`lib/permissions.ts`), um componente de UI, ou um padrão de página/rota equivalente.
3. **Confirme o escopo.** Se a tarefa é ambígua ou pode ser resolvida de várias formas, esclareça com o usuário antes de codar.
4. **Para mudanças não triviais, apresente a proposta antes de implementar** (análise → impactos → solução → só então implementar). Não faça grandes refatorações sem aprovação prévia.

## 2. Princípios de implementação

- **Evite duplicação** de código, entidades ou funcionalidades. Um novo módulo compartilha o núcleo (auth, permissões, QR/etiqueta, convenções) e só cria o que for genuinamente específico.
- **Reutilize componentes e padrões** sempre que possível. Ex.: etiquetas reaproveitam `components/QrCode.tsx` e `labelDimensions`; páginas seguem o par Server Component + Client Component.
- **Preserve a compatibilidade.** Não quebre funcionalidades existentes. Ex.: ao estender a resolução de QR, mantenha `parseScan` intacto para não regredir a leitura patrimonial legada e as auditorias.
- **Priorize simplicidade de uso.** Mobile-first, poucos cliques, telas simples. Auto-selecione quando houver uma única opção. Pense no voluntário com pouco treinamento.
- **Segurança por padrão.** Toda tabela nova: RLS habilitado + `revoke` de `anon, authenticated`. Rotas públicas usam `select` explícito de colunas (nunca `select *`). Nunca exponha o UUID interno em URL pública — use `public_code`.
- **Consistência.** Mantenha nomenclatura (tabelas/rotas em inglês, UI em PT-BR), padrões de UX e a estrutura de pastas do projeto.

## 3. Padrões concretos a seguir

### Página (leitura)
Server Component: `await requireUser()` → busca via `supabaseAdmin` com filtros de `searchParams` → passa props (incluindo flags de permissão) para um Client Component (`"use client"`) que muta via `fetch('/api/...')` + `router.refresh()`.

### Rota de API (escrita)
`requireApiUser()` → `parse` com schema Zod (`lib/validators.ts`) → checagem em `lib/permissions.ts` → `supabaseAdmin`/`rpc` → erros via `errorResponse` (`lib/api.ts`). Params dinâmicos são `Promise` no Next 15: `const { id } = await params`.

### Banco de dados
- Migrations em `supabase/migrations/`, nomeadas em ordem lexicográfica, **idempotentes** e **replayáveis do zero**.
- Aplicar via MCP (`apply_migration` no projeto Supabase) **e salvar o arquivo no repo** — os dois sempre juntos, nunca só um.
- Convenções: `uuid` PK `default gen_random_uuid()`, timestamps `created_at`/`updated_at`, trigger `touch_updated_at`, funções com `set search_path = public, pg_temp`, índices para colunas de filtro/junção.
- Escrita que precisa de atomicidade (múltiplas linhas/transação) → função Postgres chamada via `supabaseAdmin.rpc(...)`, com mensagens de erro em PT-BR.

### QR Code
- Novo tipo de código público → reserve/implemente um **prefixo** em `parseScanTarget` e trate-o na página `/p/[code]`. Não crie um mecanismo paralelo de resolução.
- URLs de QR usam `publicUrl()` (base em `NEXT_PUBLIC_APP_URL`).

## 4. O que NÃO fazer

- Não acessar o banco fora do `supabaseAdmin` nem tentar usar RLS/policies para autorização (a autorização é na aplicação).
- Não escrever direto em `stock_levels`/`stock_movements` — sempre pela RPC `apply_stock_movement`.
- Não seguir a rota legada `/api/dashboard` como padrão (agregações ficam na server page).
- Não adaptar o módulo de patrimônio para estoque (nem o contrário).
- Não adicionar dependências sem necessidade real.
- Não fazer push direto na `main` nem force-push; use branch → PR.
- Não incluir atribuição de ferramenta de desenvolvimento em commits ou PRs; corpo de PR contém apenas informação técnica (objetivo, migrations, impactos, validações, pendências, checklist).

## 5. Verificação

O projeto **não tem testes automatizados**. Verifique por:
- `npm run build` (com env dummy do Supabase, pois `lib/supabase.ts` exige as variáveis).
- Exercício manual do fluxo afetado.
- Consultas via MCP do Supabase para conferir dados (`execute_sql`) e `get_advisors` após mudanças de schema.
- Limpe quaisquer dados de teste criados em produção ao final.

## 6. Documentação (obrigatório)

- **Documente decisões arquiteturais relevantes** no `PROJECT_CONTEXT.md` (o quê e, principalmente, o **porquê**).
- **Sempre que uma funcionalidade alterar significativamente a arquitetura ou o funcionamento**, atualize `PROJECT_CONTEXT.md` e/ou `AI_INSTRUCTIONS.md` **no mesmo Pull Request** da mudança. A documentação não deve ficar defasada em relação ao código.
- Mudanças pequenas que não afetam arquitetura não exigem atualização destes documentos.

## 7. Checklist rápido por tarefa

- [ ] Li `PROJECT_CONTEXT.md` e os arquivos do núcleo relevantes.
- [ ] Verifiquei o que já existe e reutilizei (helpers, schemas, constantes, componentes, padrões).
- [ ] Segui os padrões de página/API/DB/QR do projeto.
- [ ] Preservei funcionalidades existentes (sem regressão).
- [ ] Mantive a experiência simples (mobile-first, poucos cliques).
- [ ] Tabelas novas com RLS + revoke; rotas públicas sem `select *`; sem UUID em URL pública.
- [ ] Migrations aplicadas via MCP **e** salvas no repo, replayáveis.
- [ ] `npm run build` passou; fluxo verificado manualmente; dados de teste limpos.
- [ ] Atualizei a documentação se a arquitetura mudou (mesmo PR).
- [ ] Mudança entra por branch → PR, sem atribuição de ferramenta.
