"use client";

import { QrCode } from "@/components/QrCode";
import { labelDimensions, stockUnitLabels, type LabelType, type StockUnit } from "@/lib/constants";
import { publicUrl } from "@/lib/qr";

export type StockLabelProduct = {
  id: string;
  public_code: string;
  name: string;
  unit: string;
};

// Etiqueta de produto de estoque nos modelos Brother QL-810W.
// O QR contém a URL pública (/p/{public_code}) — a câmera nativa do celular
// abre direto a página consultiva do produto.
export function StockLabel({ product, model }: { product: StockLabelProduct; model: LabelType }) {
  const dim = labelDimensions[model];
  const unitLabel = stockUnitLabels[product.unit as StockUnit] ?? product.unit;

  if (model === "dk11221") return <div className="label" style={{ width: "23mm", height: "23mm", padding: "1mm", display: "grid", placeItems: "center", overflow: "hidden" }}><QrCode value={publicUrl(product.public_code)} size={56} /><span style={{ fontSize: "1.8mm", fontWeight: 700, maxWidth: "21mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</span></div>;
  if (model === "dk11209") return <div className="label" style={{ width: "29mm", height: "62mm", padding: "1mm", display: "flex", flexDirection: "column", gap: "2mm", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><QrCode value={publicUrl(product.public_code)} size={96} /><div style={{ minWidth: 0, display: "grid", gap: "1mm", textAlign: "center" }}><strong style={{ fontSize: "2.8mm", lineHeight: 1.05 }}>{product.name}</strong><span style={{ fontSize: "2.2mm" }}>{unitLabel}</span></div></div>;

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
        <span style={{ fontSize: "2.2mm", color: "#555", fontWeight: 600 }}>{unitLabel}</span>
      </div>
      <QrCode value={publicUrl(product.public_code)} size={model === "dk2205" ? 150 : 118} />
    </div>
  );
}
