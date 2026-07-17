"use client";

import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import { labelDescriptions, labelDimensions, labelLabels, labelTypes, type LabelType } from "@/lib/constants";

// Botão "Imprimir Etiqueta" + modal de escolha do modelo, na tela do item.
export function LabelPrintModal({ itemId, defaultModel = "dk22205" }: { itemId: string; defaultModel?: string }) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<LabelType>(
    labelTypes.includes(defaultModel as LabelType) ? (defaultModel as LabelType) : "dk22205",
  );
  useEffect(() => { const saved = window.localStorage.getItem("brother-label-model") as LabelType | null; if (saved && labelTypes.includes(saved)) setModel(saved); }, []);

  function generate() {
    window.localStorage.setItem("brother-label-model", model);
    setOpen(false);
    window.open(`/labels/print?model=${model}&ids=${itemId}`, "_blank", "noopener");
  }

  return (
    <>
      <button className="button secondary" type="button" onClick={() => setOpen(true)}>
        <Printer size={15} /> Imprimir Etiqueta
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Imprimir Etiqueta</h2>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="label-options">
              {labelTypes.map((t) => (
                <label key={t} className={`label-option${model === t ? " selected" : ""}`}>
                  <input type="radio" name="label_model" value={t} checked={model === t} onChange={() => setModel(t)} />
                  <div>
                    <strong>{labelLabels[t]}</strong>
                    <span className="muted">{labelDescriptions[t]}</span>
                  </div>
                  <div className="label-option-preview" style={{ width: `${Math.min(124, labelDimensions[t].width * 2)}px`, height: `${Math.min(80, labelDimensions[t].height * 2)}px` }} aria-label={`Prévia ${labelLabels[t]}`} />
                </label>
              ))}
            </div>

            <div className="actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button className="button secondary" type="button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="button gold" type="button" onClick={generate}>
                <Printer size={15} /> Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
