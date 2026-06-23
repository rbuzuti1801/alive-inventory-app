"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Label, type LabelItem } from "@/components/Label";
import { labelLabels, type LabelType } from "@/lib/constants";

// Folha de impressão de etiquetas. Marca os itens como impressos e abre o
// diálogo de impressão (onde o usuário pode salvar como PDF).
export function LabelSheet({ items, model }: { items: LabelItem[]; model: LabelType }) {
  const [marked, setMarked] = useState(false);
  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current || items.length === 0) return;
    markedRef.current = true;
    fetch("/api/labels/print", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label_type: model, item_ids: items.map((i) => i.id) }),
    })
      .then(() => setMarked(true))
      .catch(() => setMarked(true));
  }, [items, model]);

  return (
    <div className="label-print-root">
      <div className="label-print-toolbar no-print">
        <div>
          <strong>{items.length}</strong> etiqueta(s) · modelo <strong>{labelLabels[model]}</strong>
          {marked && <span className="muted"> · marcadas como impressas</span>}
        </div>
        <button className="button gold" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="label-sheet">
        {items.map((item) => (
          <Label key={item.id} item={item} model={model} />
        ))}
        {items.length === 0 && <p className="muted">Nenhum item selecionado para impressão.</p>}
      </div>
    </div>
  );
}
