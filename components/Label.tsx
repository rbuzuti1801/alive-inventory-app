"use client";

import { QrCode } from "@/components/QrCode";
import { labelDimensions, type LabelType } from "@/lib/constants";
import { qrPayloadString, skuTail } from "@/lib/qr";

export type LabelItem = {
  id: string;
  sku: string | null;
  item_code: string;
  description: string;
  qr_code_data?: unknown;
  sectors?: { name?: string } | null;
  subcategories?: { name?: string } | null;
};

function qrValue(item: LabelItem): string {
  if (item.qr_code_data && typeof item.qr_code_data === "object") {
    return JSON.stringify(item.qr_code_data);
  }
  return qrPayloadString(item);
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

  if (model === "compacta") {
    return (
      <div className="label label-compacta" style={{ ...box, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.4mm" }}>
        <QrCode value={value} size={50} />
        <span style={{ fontFamily: "monospace", fontSize: "2.4mm", fontWeight: 700, lineHeight: 1 }}>{skuTail(sku)}</span>
      </div>
    );
  }

  if (model === "media") {
    return (
      <div className="label label-media" style={{ ...box, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8mm" }}>
        <QrCode value={value} size={78} />
        <span style={{ fontFamily: "monospace", fontSize: "2.3mm", fontWeight: 700, lineHeight: 1, textAlign: "center" }}>{sku}</span>
      </div>
    );
  }

  // completa — 50×30mm
  return (
    <div className="label label-completa" style={{ ...box, flexDirection: "row", alignItems: "center", gap: "1.5mm" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.6mm" }}>
        <span style={{ fontSize: "2.2mm", fontWeight: 800, letterSpacing: "0.2mm", color: "#202F56" }}>
          ALIVE CHURCH
        </span>
        <span style={{ fontSize: "2.6mm", fontWeight: 700, lineHeight: 1.05, color: "#111", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.description}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "2.4mm", fontWeight: 700, color: "#202F56" }}>{sku}</span>
        <span style={{ fontSize: "2mm", color: "#555" }}>
          {item.sectors?.name ?? ""}
          {item.subcategories?.name ? ` / ${item.subcategories.name}` : ""}
        </span>
      </div>
      <QrCode value={value} size={92} />
    </div>
  );
}
