"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Power, Trash2 } from "lucide-react";

type Props = {
  productId: string;
  active: boolean;
  canManage: boolean; // admin: editar, ativar/desativar, excluir
};

// Barra de gestão do produto (topo da tela de detalhe). Reutiliza os endpoints
// existentes: PUT para ativar/desativar, DELETE para excluir (admin).
export function StockProductManageBar({ productId, active, canManage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleActive() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/stock/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Não foi possível atualizar o status.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Excluir este produto definitivamente? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/stock/products/${productId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Produto com histórico: back-end sugere desativar em vez de excluir.
        setError(json.error ?? "Não foi possível excluir o produto.");
        return;
      }
      router.push("/stock?tab=produtos");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="stock-manage-bar">
      {error && <div className="alert error" style={{ width: "100%" }}>{error}</div>}
      <Link className="button secondary" href={`/stock/${productId}/edit`}>
        <Pencil size={15} /> Editar
      </Link>
      <button className="button secondary" type="button" onClick={toggleActive} disabled={busy}>
        <Power size={15} /> {active ? "Desativar" : "Ativar"}
      </button>
      <button className="button danger" type="button" onClick={remove} disabled={busy}>
        <Trash2 size={15} /> Excluir
      </button>
    </div>
  );
}
