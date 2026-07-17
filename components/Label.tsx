"use client";

import { QrCode } from "@/components/QrCode";
import { labelDimensions, type LabelType } from "@/lib/constants";
import { inventoryQrValue } from "@/lib/qr";

export type LabelItem = {
  id: string;
  public_code?: string | null;
  sku: string | null;
  item_code: string;
  description: string;
  sectors?: { name?: string } | null;
  subcategories?: { name?: string } | null;
};

function qrValue(item: LabelItem): string {
  // URL pública (/p/{public_code}) — a câmera nativa abre a consulta do item.
  return inventoryQrValue(item);
}

// Etiqueta patrimonial nos três modelos oficiais (dimensões reais em mm).
export function Label({ item, model }: { item: LabelItem; model: LabelType }) {
  const sku = item.sku ?? item.item_code;
  const value = qrValue(item);
  const dim = labelDimensions[model];

  const box: React.CSSProperties = {
    width: `${dim.width}mm`,
    height: `${dim.height}mm`,
    boxSizing: "border-box",
    border: "0.2mm solid #c9c9c9",
    borderRadius: "1mm",
    padding: "1mm",
    display: "flex",
    background: "#fff",
    overflow: "hidden",
    pageBreakInside: "avoid",
    breakInside: "avoid",
  };

  if (model === "dk11221") {
    return (
      <div className="label label-compacta" style={{ ...box, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4mm" }}>
        <QrCode value={value} size={56} />
        <span style={{ fontSize: "1.8mm", fontWeight: 700, lineHeight: 1, maxWidth: "21mm", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.description}</span>
      </div>
    );
  }

  if (model === "dk11209") {
    return (
      <div className="label label-media" style={{ ...box, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2mm" }}>
        <QrCode value={value} size={96} />
        <div style={{ minWidth: 0, display: "grid", gap: "1mm", textAlign: "center" }}>
          <span style={{ fontSize: "2.8mm", fontWeight: 800, lineHeight: 1.05, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.description}</span>
          <span style={{ fontFamily: "monospace", fontSize: "2.2mm", fontWeight: 700 }}>{sku}</span>
        </div>
      </div>
    );
  }

  // Bobinas contínuas Brother de 62 mm. O conteúdo permanece dentro do corte.
  return (
    <div className="label label-completa" style={{ ...box, flexDirection: "row", alignItems: "center", gap: "1.5mm" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.6mm" }}>
        <span style={{ fontSize: "2.6mm", fontWeight: 700, lineHeight: 1.05, color: "#111", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.description}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "2.4mm", fontWeight: 700, color: "#202F56" }}>{sku}</span>
        <span style={{ fontSize: "2mm", color: "#555" }}>
          {item.sectors?.name ?? ""}
          {item.subcategories?.name ? ` / ${item.subcategories.name}` : ""}
        </span>
      </div>
      <QrCode value={value} size={model === "dk2205" ? 150 : 118} />
    </div>
  );
}
