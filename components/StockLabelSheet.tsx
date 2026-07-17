"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { StockLabel, type StockLabelProduct } from "@/components/StockLabel";
import { labelDimensions, labelLabels, type LabelType } from "@/lib/constants";

// Folha de impressão de etiquetas de estoque. Marca os produtos como
// "etiqueta impressa" e abre o diálogo de impressão (ou salvar PDF).
export function StockLabelSheet({ products, model }: { products: StockLabelProduct[]; model: LabelType }) {
  const [marked, setMarked] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LabelType>(model);
  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current || products.length === 0) return;
    markedRef.current = true;
    fetch("/api/stock/labels/print", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product_ids: products.map((p) => p.id) }),
    })
      .then(() => setMarked(true))
      .catch(() => setMarked(true));
  }, [products]);
  useEffect(() => {
    const saved = window.localStorage.getItem("brother-label-model") as LabelType | null;
    if (saved && labelLabels[saved]) setSelectedModel(saved);
  }, []);
  const dim = labelDimensions[selectedModel];

  return (
    <div className="label-print-root">
      <div className="label-print-toolbar no-print">
        <div>
          <strong>{products.length}</strong> etiqueta(s) de estoque · Brother QL-810W
          {marked && <span className="muted"> · marcadas como impressas</span>}
        </div>
        <label className="field"><span>Modelo</span><select value={selectedModel} onChange={(e) => { const next = e.target.value as LabelType; setSelectedModel(next); window.localStorage.setItem("brother-label-model", next); }}>{Object.entries(labelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button className="button gold" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <style>{`@media print { @page { size: ${dim.width}mm ${dim.height}mm; margin: 0; } }`}</style>
      <p className="label-real-size no-print">Pré-visualização em tamanho real · {dim.width} × {dim.height} mm · imprima em escala 100%.</p>
      <div className="label-sheet" style={{ "--label-width": `${dim.width}mm`, "--label-height": `${dim.height}mm` } as React.CSSProperties}>
        {products.map((product) => (
          <StockLabel key={product.id} product={product} model={selectedModel} />
        ))}
        {products.length === 0 && <p className="muted">Nenhum produto selecionado para impressão.</p>}
      </div>
    </div>
  );
}
