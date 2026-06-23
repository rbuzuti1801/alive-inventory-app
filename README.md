# Alive Church Inventory

Webapp interno para controle de bens da Alive Church, com autenticação própria por usuário/senha, permissões por papel, banco PostgreSQL no Supabase e **identificação patrimonial por QR Code**.

## Setup

1. Copie `.env.example` para `.env.local`.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET`.
3. Rode as migrations SQL de `supabase/migrations/` no Supabase, em ordem:
   - `0001_inventory_schema.sql` — esquema base (setores, subcategorias, usuários, itens).
   - `0002_qr_patrimonial.sql` — QR Code, etiquetas, leituras (scans) e auditoria.
   - `0003_harden_search_path.sql` — hardening de segurança das funções.
4. Instale dependências com `npm install`.
5. Crie o primeiro admin com `npm run seed:admin`.
6. Inicie com `npm run dev`.

O app não possui cadastro público. Usuários internos são criados apenas por administradores.

## Identificação Patrimonial por QR Code

Cada item recebe automaticamente:

- **ID interno** (UUID).
- **SKU patrimonial** imutável no formato `A-SETOR-SUB-00001` (gerado por trigger, sequência independente por setor/subcategoria).
- **QR Code único** cujo conteúdo é o JSON `{"id","sku","name"}`.

### SKU automático

Gerado e protegido no banco pelos triggers `generate_sku()` (BEFORE INSERT) e
`protect_sku()` (BEFORE UPDATE). O SKU nunca pode ser alterado após criado e há
índice único em `inventory_items.sku`.

### Etiquetas

Três modelos oficiais (tela **Etiquetas** e botão *Imprimir Etiqueta* no item):

| Modelo    | Tamanho   | Conteúdo                                   | Uso                              |
|-----------|-----------|--------------------------------------------|----------------------------------|
| Compacta  | 20×20 mm  | QR + últimos 5 dígitos do SKU              | Microfones, fontes, adaptadores  |
| Média     | 30×30 mm  | QR + SKU reduzido                          | Mesas, cadeiras, monitores       |
| Completa  | 50×30 mm  | Logo + nome + SKU + QR + setor             | Computadores, TVs, câmeras       |

- Impressão **individual** ou **em lote** (seleção múltipla na tela de Etiquetas).
- Geração de **PDF** via diálogo de impressão do navegador (`/labels/print`).
- Itens são marcados como impressos (`label_printed`, `label_printed_at`).

### Leitura (scan)

Tela **Leitura QR**, compatível com leitor USB, câmera de celular e tablet. Cada
leitura localiza o item, registra `last_scan_at` / `last_scan_by` e grava o
histórico em `inventory_scans`.

### Inventário rápido / Auditoria

Tela **Inventário rápido**: inicia uma sessão (`inventory_audits`), escaneia os
itens encontrados (`audit_items`), exibe o progresso (encontrados/pendentes) e
gera o relatório de auditoria ao finalizar.

## Esquema de dados do módulo QR

- `inventory_items` ganhou: `qr_code_data` (jsonb), `label_type`, `label_printed`,
  `label_printed_at`, `last_scan_at`, `last_scan_by`.
- `inventory_scans` — histórico de leituras.
- `inventory_audits` — sessões de auditoria por escaneamento.
- `audit_items` — itens confirmados em cada auditoria.
- `sku_sequences` — sequência por setor/subcategoria (já existente).

Todas as tabelas usam RLS habilitado *deny-by-default*; o app acessa o banco
exclusivamente via *service role* no servidor (Next.js Route Handlers).

## Estrutura

```
app/(app)/      páginas autenticadas (dashboard, inventory, scan, labels, audit, ...)
app/labels/print  folha de impressão de etiquetas (PDF)
app/api/        route handlers (scan, labels, audits, inventory, ...)
components/     UI (QrCode, Label, Scanner, LabelsManager, AuditRunner, ...)
lib/            helpers (qr, scan-server, audit-server, validators, auth, ...)
supabase/migrations/  migrations versionadas
```
