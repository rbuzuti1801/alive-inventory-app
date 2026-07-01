"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { StockLabel, type StockLabelProduct } from "@/components/StockLabel";

// Folha de impressão de etiquetas de estoque. Marca os produtos como
// "etiqueta impressa" e abre o diálogo de impressão (ou salvar PDF).
export function StockLabelSheet({ products }: { products: StockLabelProduct[] }) {
  const [marked, setMarked] = useState(false);
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

  return (
    <div className="label-print-root">
      <div className="label-print-toolbar no-print">
        <div>
          <strong>{products.length}</strong> etiqueta(s) de estoque · 50×30mm
          {marked && <span className="muted"> · marcadas como impressas</span>}
        </div>
        <button className="button gold" type="button" onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="label-sheet">
        {products.map((product) => (
          <StockLabel key={product.id} product={product} />
        ))}
        {products.length === 0 && <p className="muted">Nenhum produto selecionado para impressão.</p>}
      </div>
    </div>
  );
}
