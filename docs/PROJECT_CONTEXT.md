# PROJECT_CONTEXT.md — Sistema de Inventário Alive Church

> Documentação oficial do projeto. Descreve o **funcionamento** do sistema e o **porquê** das decisões de arquitetura — não apenas o código. Deve ser atualizada sempre que uma mudança relevante alterar a arquitetura ou o comportamento do sistema (ver `AI_INSTRUCTIONS.md`).

---

## 1. Objetivo do projeto

Sistema interno de gestão de bens e materiais da Alive Church. Dois problemas distintos são resolvidos por dois módulos independentes:

1. **Patrimônio** — controle de bens duráveis com identidade própria (equipamentos, móveis, instrumentos, ativos de alto valor). Cada bem é único, tem SKU, QR Code, estado de conservação, localização e histórico.
2. **Estoque** — controle de materiais de consumo recorrente (água, café, descartáveis, limpeza, materiais do Kids/escritório, pilhas, etc.). Aqui o que importa é **quantidade** por localização, não identidade individual.

O sistema é operado majoritariamente por **voluntários com pouco treinamento**, então a prioridade transversal é **simplicidade e rapidez** (mobile-first, poucos cliques).

## 2. Escopo atual

- Cadastro e gestão de bens patrimoniais, com geração automática de SKU e QR Code.
- Impressão de etiquetas patrimoniais (3 tamanhos) e leitura por QR (câmera do app, leitor USB ou digitação).
- Sessões de "inventário rápido" (auditoria por escaneamento) para conferência de presença de bens.
- Relatórios e exportação do patrimônio.
- Cadastro de produtos de consumo e localizações físicas de estoque.
- Movimentações de estoque (entrada, saída, ajuste, transferência) com histórico imutável e saldo por produto × localização.
- Página pública consultiva de produto via QR Code (deep link), com ações liberadas após login.
- Dashboard unificado com indicadores de patrimônio e estoque.
- Gestão de usuários internos, setores e subcategorias.

## 3. Módulos existentes

### 3.1 Patrimônio (`inventory_*`)
- Entidade central: `inventory_items`. Cada item tem `sku` (único), `item_code`, descrição, setor, subcategoria, marca, modelo, quantidade, estado de conservação, localização (texto livre), dados de aquisição, status e `qr_code_data` (JSON).
- SKU gerado por trigger no banco (`generate_sku`) no formato `A-{SETOR}-{SUB}-00000`, usando a tabela `sku_sequences`. Uma vez gerado, o SKU é **imutável** (`protect_sku`).
- Leitura/consulta: `/scan`; etiquetas: `/labels`; auditoria: `/audit`; relatórios: `/reports`.

### 3.2 Estoque (`stock_*`)
- `stock_products` — catálogo de consumíveis. Cada produto tem `public_code` estável (`E-{hex}`), categoria, unidade, estoque mínimo.
- `stock_locations` — localizações físicas (prateleira, armário, sala). Podem estar ligadas a um setor.
- `stock_levels` — saldo por par `(produto, localização)`. **Um produto pode existir em várias localizações simultaneamente** (o saldo total é a soma das linhas).
- `stock_movements` — histórico imutável de todas as movimentações.
- Toda escrita de saldo passa pela RPC atômica `apply_stock_movement` (ver §7).
- Hub operacional: `/stock` (abas Produtos / Localizações / Movimentações). Página pública do produto: `/p/{public_code}`.

### 3.3 Núcleo compartilhado
- Autenticação, sessão e permissões.
- Infraestrutura de QR Code e etiquetas.
- Convenções de página, API, validação e constantes.
- Dashboard e navegação.

## 4. Filosofia de UX/UI

- **Mobile-first e poucos cliques.** O fluxo-alvo de estoque é: escanear QR → tocar na ação → informar quantidade → confirmar (≈ 3 toques). Campos são auto-selecionados quando há apenas uma opção (ex.: única localização com saldo).
- **Telas simples.** Evitar telas densas; priorizar botões grandes, steppers e presets numéricos (1/5/10) em vez de digitação livre quando possível.
- **Zero fricção para voluntários.** Qualquer usuário ativo consegue movimentar estoque. Ações que exigem mais responsabilidade (ajuste de contagem, cadastro) são restritas por papel, mas nunca bloqueiam o fluxo operacional comum.
- **Consulta antes de ação.** A página pública do produto abre em modo leitura mesmo sem login, mostrando o essencial (saldo, localização, status). A ação só aparece após autenticação, preservando o contexto do produto escaneado.
- **Feedback claro e imediato.** Sucesso/erro em destaque; mensagens de erro vêm do banco em PT-BR (ex.: "Saldo insuficiente na origem: disponível X, solicitado Y").

## 5. Principais decisões arquiteturais

| Decisão | Motivo |
|---|---|
| **Acesso ao banco apenas via service role** (`supabaseAdmin`), com RLS deny-by-default e sem policies | O app é 100% server-side; a autorização é feita na camada de aplicação (`lib/permissions.ts`), não no banco. RLS ligado + `revoke` garante que `anon`/`authenticated` não acessem nada diretamente, mesmo se a chave pública vazar. |
| **Autenticação própria com JWT em cookie httpOnly** (não Supabase Auth) | Usuários são internos (`users_internal`), com papéis próprios e login por usuário/senha (bcrypt). Não há necessidade do fluxo de auth do Supabase; o controle fica simples e sob domínio do app. |
| **Server Components buscam dados diretamente; Client Components mutam via `/api`** | Menos round-trips na leitura (a página já entrega os dados renderizados) e um ponto único de validação/autorização na escrita (as rotas de API). |
| **Movimentações de estoque via RPC atômica no Postgres** | O `supabase-js` não tem transações. Transferência = débito + crédito que precisam ser atômicos; a RPC garante consistência e valida saldo não-negativo no banco. |
| **Saldo materializado (`stock_levels`) mantido só pela RPC** | Leitura de saldo é frequente (dashboard, página pública, listagens); materializar evita recomputar a partir do histórico a cada consulta. A RPC é a única porta de escrita, então o saldo nunca diverge. |
| **Identidade pública separada da chave interna** (`public_code` vs `id` UUID) | A URL do QR não expõe o UUID interno; o `public_code` é curto (QR menos denso, imprime melhor) e estável mesmo que a estrutura interna mude. |
| **Migrations versionadas e replayáveis do zero** | Houve um episódio de "drift" (migrations aplicadas em produção mas ausentes no repo). A regra agora é: toda migration aplicada via MCP também é salva em `supabase/migrations/`, e o repositório deve reconstruir o banco do zero na ordem lexicográfica. |

## 6. Diferenças entre Patrimônio e Estoque

| Aspecto | Patrimônio (`inventory_items`) | Estoque (`stock_products`) |
|---|---|---|
| Natureza | Bem único, com identidade | Material de consumo, controlado por quantidade |
| Identificador | `sku` `A-{SETOR}-{SUB}-00000` (imutável, por trigger) | `public_code` `E-{hex}` (gerado no banco) |
| Conteúdo do QR | JSON `{id, sku, name}` em `qr_code_data` | Deep link `NEXT_PUBLIC_APP_URL/p/{public_code}` |
| Localização | Campo texto livre no item | Entidade própria (`stock_locations`); saldo por par produto×localização |
| Quantidade | Atributo simples do item | Saldo dinâmico, alterado por movimentações |
| Operações | CRUD, auditoria, etiquetas, relatórios | Entrada, saída, ajuste, transferência (via RPC), histórico |
| Estado | Estado de conservação, status (ativo/inativo/descartado) | Status calculado do saldo vs. mínimo (normal/atenção/baixo) |

**Princípio:** os módulos são independentes. Não adaptar o módulo de patrimônio para tratar estoque (nem vice-versa). Compartilhar apenas o núcleo (auth, permissões, infra de QR/etiqueta, convenções).

## 7. Estratégia de QR Code e Deep Links

### Patrimônio
- O QR carrega o JSON `{id, sku, name}` (persistido em `inventory_items.qr_code_data` pelo trigger).
- Lido pelo scanner interno (`/scan`) via `lib/qr.ts::parseScan` → resolve o item (`lib/scan-server.ts::resolveScannedItem`).
- Etiquetas em 3 tamanhos: `compacta` (20×20mm), `media` (30×30mm), `completa` (50×30mm).

### Estoque
- O QR carrega uma **URL de deep link**: `NEXT_PUBLIC_APP_URL/p/{public_code}`. A câmera nativa do celular abre a página direto, sem depender do app ou de leitor externo.
- O identificador é do **produto**, não da prateleira — a localização física pode mudar sem invalidar a etiqueta.
- Etiqueta 50×30mm: `NOME · QR · UNIDADE`.

### Resolução genérica (extensível)
`lib/qr.ts::parseScanTarget(raw)` centraliza a interpretação de qualquer leitura e devolve um alvo tipado (união discriminada):

- Reconhece a URL `/p/{code}` **ou** um `public_code` cru.
- O **prefixo** do código identifica o módulo:
  - `E-` → produto de estoque (**implementado**);
  - `B-` → bem patrimonial (**reservado**);
  - `L-` → localização (**reservado**).
- Se não for um `public_code`, delega ao `parseScan` (JSON patrimonial legado, UUID cru ou SKU). Assim, **QRs patrimoniais antigos continuam funcionando** sem regressão.

A página `/p/[code]` é o **resolvedor público universal**: despacha por prefixo, hoje só `E-`; prefixos reservados retornam uma página amigável de "código não reconhecido". Novos módulos entram adicionando um prefixo, sem tocar nos existentes.

### Página pública e login com contexto
- `/p/{code}` é rota pública (liberada no `middleware.ts`). Sem sessão: só leitura + botão "Entrar para movimentar estoque" → `/login?next=/p/{code}`.
- Após o login, o usuário volta ao produto escaneado (contexto preservado). O parâmetro `next` é **sanitizado** (só aceita caminhos internos começando com `/` e não `//`) para evitar open redirect.
- A URL base vem de `NEXT_PUBLIC_APP_URL` (domínio oficial: `https://inv.alivechurchalphaville.com.br`), configurada nos 3 ambientes da Vercel.

## 8. Autenticação e permissões

### Autenticação
- Login por usuário/senha (`users_internal`, hash bcrypt). Sessão em **JWT** (`jose`) dentro de cookie **httpOnly** (`alive_inventory_session`), expiração de 8h.
- `lib/auth.ts`: `createSession`, `getSessionUser`, `requireUser` (páginas — redireciona para `/login`), `requireApiUser` (rotas — retorna 401).
- `middleware.ts` bloqueia tudo sem cookie, exceto `publicPaths = ["/login", "/api/auth/login", "/p"]`.

### Papéis
`admin`, `responsavel`, `visualizador` (em `lib/constants.ts`).

### Regras (`lib/permissions.ts`)
| Ação | Regra |
|---|---|
| Gerenciar usuários / taxonomia (setores, subcategorias) | `admin` |
| Criar/editar bem patrimonial | `admin` ou `responsavel` do setor do item |
| Excluir bem patrimonial | `admin` |
| **Movimentar estoque** (entrada/saída/transferência) | Qualquer usuário ativo (`canMoveStock`) |
| **Ajustar contagem** de estoque | `admin` ou `responsavel` (`canAdjustStock`) |
| **Gerenciar catálogo/localizações** de estoque | `admin` (`canManageStock`) |

**Racional:** voluntários (frequentemente `visualizador`) precisam registrar consumo sem fricção, então movimentar é liberado a todos. Ajuste corrige saldo absoluto → exige mais responsabilidade. Catálogo e localizações são estruturais → só admin.

## 9. Convenções do projeto

- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript; Supabase Postgres 17; deploy na Vercel.
- **Nomes de tabela e rota em inglês** (`stock_*`, `inventory_*`); **UI em PT-BR** (labels em `lib/constants.ts`).
- **Padrão de página:** Server Component (`requireUser()` + busca direta via `supabaseAdmin`, filtros por `searchParams`) → passa props para Client Component (`"use client"`) que muta via `fetch('/api/...')` + `router.refresh()`.
- **Padrão de API:** `requireApiUser()` → `Zod` (`lib/validators.ts`) → checagem em `lib/permissions.ts` → `supabaseAdmin`/RPC → erros via `lib/api.ts::errorResponse`.
- **Leituras de lista ficam nas server pages**, não em rotas `/api` (a rota legada `/api/dashboard` duplica lógica e **não** deve ser seguida como padrão).
- **Validação e constantes centralizadas:** todo enum/label novo vai em `lib/constants.ts`; todo schema em `lib/validators.ts`.
- **Migrations:** em `supabase/migrations/`, aplicadas via MCP **e** salvas no repo; devem ser idempotentes e replayáveis do zero na ordem lexicográfica. Funções com `set search_path = public, pg_temp`. RLS habilitado + `revoke` de `anon, authenticated` em toda tabela nova.
- **Sem novas dependências** salvo se essencial.
- **Build local** exige valores dummy de env do Supabase (o `lib/supabase.ts` lança erro se faltarem); rotas são dinâmicas, então não há chamada real ao banco no build.
- **Histórico Git limpo e independente da ferramenta:** commits e PRs sem atribuição de ferramenta de desenvolvimento; corpos de PR contêm apenas informação técnica; mudanças entram por branch → PR (a `main` não recebe push direto).

## 10. Funcionalidades implementadas

**Patrimônio**
- CRUD de bens; geração automática e imutável de SKU; QR Code por item.
- Etiquetas patrimoniais (compacta/media/completa) com impressão em lote.
- Leitura/consulta por QR (`/scan`): câmera, leitor USB e digitação, com deduplicação.
- Inventário rápido / auditoria por escaneamento (`/audit`): sessões com itens esperados × encontrados, progresso e finalização.
- Relatórios e exportação (`/reports`).
- Gestão de setores/subcategorias e usuários internos.

**Estoque**
- Catálogo de produtos (categoria, unidade, estoque mínimo) e localizações físicas.
- Saldo por produto × localização (multi-localização nativa).
- Movimentações atômicas: entrada, saída, ajuste e transferência, com histórico.
- Página pública do produto (`/p/{code}`) com consulta sem login e ações após login.
- Etiquetas de estoque 50×30mm com deep link e impressão em lote.
- Status visual do saldo (normal/atenção/baixo) vs. estoque mínimo.

**Compartilhado**
- Dashboard com indicadores de patrimônio e seção de estoque (alertas de reposição, mais consumidos em 30 dias, últimas movimentações).
- Resolução genérica de QR (dispatch por prefixo).

## 11. Roadmap de evolução

A modelagem já foi preparada para as expansões abaixo (nenhuma implementada ainda):

- **Compras / EAN** — o campo `barcode` em `stock_products` está reservado para código de barras comercial.
- **Requisições internas / solicitações de materiais** — uma futura tabela `stock_requests` que, ao ser aprovada, chama a **mesma** RPC `apply_stock_movement` (por isso a RPC recebe `p_reason`/`p_user_id` e retorna `movement_id`).
- **Almoxarifado central** — o modelo de transferência entre localizações já representa fluxo de almoxarifado → pontos de consumo.
- **Novos módulos por QR** — os prefixos `B-` (patrimônio) e `L-` (localização) já estão reservados no resolvedor genérico; um novo módulo entra adicionando o prefixo, sem alterar os existentes.

## 12. Mapa rápido de arquivos

| Caminho | Papel |
|---|---|
| `lib/supabase.ts` | Cliente `supabaseAdmin` (service role) |
| `lib/auth.ts` | Sessão JWT, `requireUser`/`requireApiUser` |
| `lib/permissions.ts` | Regras de autorização (`can*`) |
| `lib/qr.ts` | `parseScan`, `parseScanTarget`, `publicUrl`, payloads de QR |
| `lib/scan-server.ts` | Resolução de leituras (`resolveScannedItem`, `resolveScanTarget`) |
| `lib/validators.ts` | Schemas Zod |
| `lib/constants.ts` | Enums e labels PT-BR |
| `lib/api.ts` | `errorResponse` e helpers de request |
| `lib/audit-server.ts` | Progresso de auditoria patrimonial |
| `middleware.ts` | Gate de autenticação e rotas públicas |
| `app/(app)/*` | Páginas autenticadas (dashboard, inventory, stock, scan, labels, audit, reports, sectors, users) |
| `app/p/[code]/` | Resolvedor público universal de QR |
| `app/api/**` | Rotas de mutação |
| `supabase/migrations/` | Migrations versionadas |
