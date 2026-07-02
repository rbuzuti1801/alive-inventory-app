"use client";

import { QrCode } from "@/components/QrCode";
import { labelDimensions, stockUnitLabels, type StockUnit } from "@/lib/constants";
import { publicUrl } from "@/lib/qr";

export type StockLabelProduct = {
  id: string;
  public_code: string;
  name: string;
  unit: string;
};

// Etiqueta de produto de estoque (50×30mm, mesma bobina da "completa").
// O QR contém a URL pública (/p/{public_code}) — a câmera nativa do celular
// abre direto a página consultiva do produto.
export function StockLabel({ product }: { product: StockLabelProduct }) {
  const dim = labelDimensions.completa;
  const unitLabel = stockUnitLabels[product.unit as StockUnit] ?? product.unit;

  return (
    <div
      className="label label-stock"
      style={{
        width: `${dim.width}mm`,
        height: `${dim.height}mm`,
        boxSizing: "border-box",
        border: "0.2mm solid #c9c9c9",
        borderRadius: "1mm",
        padding: "1mm",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "1.5mm",
        background: "#fff",
        overflow: "hidden",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.8mm" }}>
        <span style={{ fontSize: "2.2mm", fontWeight: 800, letterSpacing: "0.2mm", color: "#202F56" }}>
          ALIVE CHURCH · ESTOQUE
        </span>
        <span
          style={{
            fontSize: "3.2mm",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "#111",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "2.2mm", fontWeight: 700, color: "#202F56" }}>
          {product.public_code}
        </span>
        <span style={{ fontSize: "2.2mm", color: "#555", fontWeight: 600 }}>{unitLabel}</span>
      </div>
      <QrCode value={publicUrl(product.public_code)} size={92} />
    </div>
  );
}
