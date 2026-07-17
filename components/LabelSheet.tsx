"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Label, type LabelItem } from "@/components/Label";
import { labelDimensions, labelLabels, type LabelType } from "@/lib/constants";

// Folha de impressão de etiquetas. Marca os itens como impressos e abre o
// diálogo de impressão (onde o usuário pode salvar como PDF).
export function LabelSheet({ items, model }: { items: LabelItem[]; model: LabelType }) {
  const [marked, setMarked] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LabelType>(model);
  const markedRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("brother-label-model") as LabelType | null;
    if (saved && labelLabels[saved]) setSelectedModel(saved);
  }, []);

  useEffect(() => {
    if (markedRef.current || items.length === 0) return;
    markedRef.current = true;
    fetch("/api/labels/print", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label_type: selectedModel, item_ids: items.map((i) => i.id) }),
    })
      .then(() => setMarked(true))
      .catch(() => setMarked(true));
  }, [items, selectedModel]);

  const dim = labelDimensions[selectedModel];
  function changeModel(next: LabelType) {
    setSelectedModel(next);
    window.localStorage.setItem("brother-label-model", next);
  }

  return (
    <div className="label-print-root">
      <div className="label-print-toolbar no-print">
        <div>
          <strong>{items.length}</strong> etiqueta(s) · Brother QL-810W
          {marked && <span className="muted"> · marcadas como impressas</span>}
        </div>
        <label className="field"><span>Modelo</span><select value={selectedModel} onChange={(e) => changeModel(e.target.value as LabelType)}>{Object.entries(labelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button className="button gold" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <style>{`@media print { @page { size: ${dim.width}mm ${dim.height}mm; margin: 0; } }`}</style>
      <p className="label-real-size no-print">Pré-visualização em tamanho real · {dim.width} × {dim.height} mm · imprima em escala 100%.</p>
      <div className="label-sheet" style={{ "--label-width": `${dim.width}mm`, "--label-height": `${dim.height}mm` } as React.CSSProperties}>
        {items.map((item) => (
          <Label key={item.id} item={item} model={selectedModel} />
        ))}
        {items.length === 0 && <p className="muted">Nenhum item selecionado para impressão.</p>}
      </div>
    </div>
  );
}
