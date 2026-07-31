// Documentos imprimíveis (A4) autocontidos.
//
// O projeto não tem biblioteca de PDF: "gerar PDF" é abrir um documento HTML
// completo numa janela nova e chamar window.print() — o usuário escolhe
// "Salvar como PDF" no diálogo do navegador. Mesma técnica já usada na Lista
// de Compras (components/StockShoppingList.tsx), aqui centralizada porque
// agora há mais de um documento oficial (Solicitação de Compra e Ordem de
// Serviço) e todos compartilham cabeçalho institucional e assinaturas.

import { institution, institutionLines } from "@/lib/institution";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCurrency(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Datas vindas do banco como `YYYY-MM-DD` (sem fuso) não podem passar por
 *  `new Date()`, que as interpreta em UTC e volta um dia. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const iso = value.slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
}

export type DocField = { label: string; value: string | null | undefined; wide?: boolean };

/** Bloco "rótulo + valor" em grade. Campos vazios continuam visíveis (com
 *  linha em branco) — no papel eles são preenchidos à mão. */
export function fieldsBlock(fields: DocField[]) {
  return `<div class="fields">${fields
    .map(
      (f) => `<div class="field${f.wide ? " wide" : ""}">
        <span class="field-label">${escapeHtml(f.label)}</span>
        <span class="field-value">${f.value ? escapeHtml(String(f.value)) : "&nbsp;"}</span>
      </div>`,
    )
    .join("")}</div>`;
}

export function section(title: string, content: string) {
  return `<section class="block"><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

/** Linhas de assinatura física (uma coluna por assinante). */
export function signaturesBlock(signers: { role: string; name?: string | null }[]) {
  return `<div class="signatures">${signers
    .map(
      (s) => `<div class="signature">
        <div class="signature-line"></div>
        <strong>${escapeHtml(s.role)}</strong>
        <span>${s.name ? escapeHtml(s.name) : "Nome: ______________________________"}</span>
        <span>Data: ____ / ____ / ________</span>
      </div>`,
    )
    .join("")}</div>`;
}

/** Documento A4 completo, com logo e dados institucionais no cabeçalho. */
export function buildDocument({
  documentTitle,
  headline,
  number,
  meta,
  body,
  origin,
}: {
  documentTitle: string;
  headline: string;
  number: string;
  meta: string[];
  body: string;
  /** `window.location.origin` — necessário porque a janela de impressão é
   *  aberta em branco e não resolve caminhos relativos. */
  origin: string;
}) {
  const lines = institutionLines()
    .map((line) => `<span>${escapeHtml(line)}</span>`)
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(documentTitle)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 12px; line-height: 1.45; }
  header.doc-head { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #202F56; padding-bottom: 10px; margin-bottom: 14px; }
  header.doc-head img { height: 46px; width: auto; }
  .institution { display: flex; flex-direction: column; }
  .institution strong { font-size: 14px; color: #202F56; }
  .institution span { font-size: 10.5px; color: #555; }
  .doc-id { margin-left: auto; text-align: right; }
  .doc-id .doc-type { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #555; }
  .doc-id .doc-number { font-size: 16px; font-weight: 800; color: #202F56; font-family: monospace; }
  h1 { font-size: 15px; margin: 0 0 4px; }
  .meta { font-size: 10.5px; color: #555; margin-bottom: 14px; }
  .block { margin-bottom: 14px; page-break-inside: avoid; }
  .block h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #202F56; margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid #d5d5d5; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
  .field { display: flex; flex-direction: column; min-width: 0; }
  .field.wide { grid-column: 1 / -1; }
  .field-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
  .field-value { font-size: 12px; border-bottom: 1px solid #ccc; padding: 2px 0; min-height: 16px; word-wrap: break-word; white-space: pre-wrap; }
  .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px; margin-top: 34px; page-break-inside: avoid; }
  .signature { display: flex; flex-direction: column; gap: 2px; font-size: 10.5px; }
  .signature-line { border-top: 1px solid #111; margin-bottom: 5px; }
  .signature strong { font-size: 11px; }
  footer.doc-foot { margin-top: 18px; border-top: 1px solid #ddd; padding-top: 6px; font-size: 9.5px; color: #777; }
  @media screen { body { padding: 24px; max-width: 900px; margin: 0 auto; } }
  @media (max-width: 640px) { .fields, .signatures { grid-template-columns: 1fr; } }
</style>
</head>
<body onload="window.focus();window.print();">
  <header class="doc-head">
    <img src="${origin}${institution.logoPath}" alt="${escapeHtml(institution.name)}" />
    <div class="institution">
      <strong>${escapeHtml(institution.name)}</strong>
      ${lines}
    </div>
    <div class="doc-id">
      <div class="doc-type">${escapeHtml(documentTitle)}</div>
      <div class="doc-number">${escapeHtml(number)}</div>
    </div>
  </header>

  <h1>${escapeHtml(headline)}</h1>
  <div class="meta">${meta.map((m) => escapeHtml(m)).join(" · ")}</div>

  ${body}

  <footer class="doc-foot">
    Documento gerado pelo sistema de inventário da ${escapeHtml(institution.name)} em ${escapeHtml(
      new Date().toLocaleString("pt-BR"),
    )} · válido mediante assinatura física.
  </footer>
</body>
</html>`;
}

/** Abre o documento numa janela nova. Devolve a mensagem de erro (pop-up
 *  bloqueado) ou `null` em caso de sucesso. */
export function openPrintDocument(html: string): string | null {
  const win = window.open("", "_blank");
  if (!win) return "Permita pop-ups para imprimir ou gerar o PDF.";
  win.document.write(html);
  win.document.close();
  return null;
}
