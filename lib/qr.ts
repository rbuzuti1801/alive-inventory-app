// Helpers do conteúdo do QR Code patrimonial.
// O QR armazena { id, sku, name } — o mesmo formato persistido em
// inventory_items.qr_code_data pelo trigger generate_sku().

export type QrPayload = {
  id: string;
  sku: string;
  name: string;
};

/** Monta o JSON oficial do QR a partir de um item. */
export function buildQrPayload(item: {
  id: string;
  sku?: string | null;
  item_code?: string | null;
  description?: string | null;
}): QrPayload {
  return {
    id: item.id,
    sku: item.sku ?? item.item_code ?? "",
    name: item.description ?? "",
  };
}

/** String compacta gravada dentro do QR Code. */
export function qrPayloadString(item: Parameters<typeof buildQrPayload>[0]): string {
  return JSON.stringify(buildQrPayload(item));
}

/**
 * Interpreta o conteúdo lido de um QR Code.
 * Aceita o JSON oficial { id, sku, name } ou, como fallback, um SKU/UUID cru
 * (útil para etiquetas antigas ou leitura manual).
 */
export function parseScan(raw: string): { id?: string; sku?: string } | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const id = typeof parsed.id === "string" ? parsed.id : undefined;
      const sku = typeof parsed.sku === "string" ? parsed.sku : undefined;
      if (id || sku) return { id, sku };
    }
  } catch {
    // não é JSON — segue para os fallbacks
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(text)) return { id: text };

  // Qualquer outra coisa é tratada como SKU/item_code.
  return { sku: text };
}

/** Últimos N dígitos do SKU (ex.: "00001" da etiqueta compacta). */
export function skuTail(sku: string, n = 5): string {
  const digits = sku.replace(/\D/g, "");
  return digits.slice(-n) || sku.slice(-n);
}

// ── Resolução genérica de códigos públicos ────────────────────────────────
// Códigos públicos estáveis viajam no QR como URL (/p/{code}) e o PREFIXO
// identifica o módulo dono do código — extensível sem acoplar módulos:
//   E- → produto de estoque (implementado)
//   B- → bem patrimonial   (reservado)
//   L- → localização       (reservado)

export type ScanTarget =
  | { kind: "stock_product"; code: string }
  | { kind: "inventory_item"; id?: string; sku?: string };

const publicCodeRe = /^[A-Za-z]-[0-9a-f]{6,32}$/i;

/** Normaliza um public_code para o formato persistido (prefixo maiúsculo + hex minúsculo). */
export function normalizePublicCode(code: string): string {
  return `${code.slice(0, 1).toUpperCase()}-${code.slice(2).toLowerCase()}`;
}

/** URL pública gravada no QR Code (câmera nativa do celular abre direto). */
export function publicUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/p/${code}`;
}

/**
 * Interpreta qualquer leitura de QR e identifica o módulo de destino.
 * Aceita a URL pública (/p/{code}), um public_code cru ou, como fallback,
 * o conteúdo patrimonial legado (JSON {id,sku}, UUID ou SKU) via parseScan.
 */
export function parseScanTarget(raw: string): ScanTarget | null {
  const text = raw.trim();
  if (!text) return null;

  const urlMatch = text.match(/\/p\/([A-Za-z]-[0-9a-f]{6,32})(?:[/?#]|$)/i);
  const code = urlMatch?.[1] ?? (publicCodeRe.test(text) ? text : null);
  if (code) {
    const normalized = normalizePublicCode(code);
    if (normalized.startsWith("E-")) return { kind: "stock_product", code: normalized };
    return null; // prefixo reservado: ainda não há módulo que o resolva
  }

  const parsed = parseScan(text);
  return parsed ? { kind: "inventory_item", ...parsed } : null;
}
