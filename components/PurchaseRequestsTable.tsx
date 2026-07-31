"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  MobileSort,
  SortableTh,
  TableFooter,
  useTableSort,
  usePagination,
  type SortAccessors,
} from "@/components/table-controls";
import { purchaseRequestStatusLabels, purchaseRequestStatuses, type PurchaseRequestStatus } from "@/lib/constants";

export type PurchaseRequestRow = {
  id: string;
  request_number: string;
  requester_name: string;
  department: string | null;
  item_name: string;
  quantity: number;
  status: PurchaseRequestStatus;
  created_at: string;
};

type SortKey = "request_number" | "requester_name" | "department" | "item_name" | "quantity" | "status" | "created_at";

const columns: { key: SortKey; label: string }[] = [
  { key: "request_number", label: "Número" },
  { key: "requester_name", label: "Solicitante" },
  { key: "department", label: "Ministério / Depto." },
  { key: "item_name", label: "Item" },
  { key: "quantity", label: "Qtd." },
  { key: "created_at", label: "Recebida em" },
  { key: "status", label: "Status" },
];

const accessors: SortAccessors<PurchaseRequestRow, SortKey> = {
  request_number: (r) => r.request_number,
  requester_name: (r) => r.requester_name,
  department: (r) => r.department ?? "",
  item_name: (r) => r.item_name,
  quantity: (r) => Number(r.quantity),
  status: (r) => purchaseRequestStatusLabels[r.status] ?? r.status,
  created_at: (r) => r.created_at,
};

// Listagem da triagem. Busca e filtro vivem na URL (server page consulta o
// banco); ordenação e paginação são client-side, como nas demais listagens.
export function PurchaseRequestsTable({ requests }: { requests: PurchaseRequestRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sorted, sort, toggleSort } = useTableSort<PurchaseRequestRow, SortKey>(requests, accessors, { key: "created_at", dir: "desc" });
  const { visible, total, start, page, totalPages, pageSize, setPageSize, setPage } = usePagination(
    sorted,
    searchParams.toString(),
  );

  function sortBy(key: SortKey) {
    toggleSort(key);
    setPage(1);
  }

  function updateFilter(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (value) params.set(key, String(value));
    });
    router.push(`/purchase-requests?${params.toString()}`);
  }

  return (
    <>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          updateFilter(e.currentTarget);
        }}
      >
        <div className="field">
          <label>Busca</label>
          <input
            name="search"
            defaultValue={searchParams.get("search") ?? ""}
            placeholder="Número, solicitante, item…"
            style={{ minWidth: 220 }}
          />
        </div>
        <div className="field">
          <label>Status</label>
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos</option>
            {purchaseRequestStatuses.map((s) => (
              <option key={s} value={s}>
                {purchaseRequestStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ministério / Departamento</label>
          <input name="department" defaultValue={searchParams.get("department") ?? ""} />
        </div>
        <button className="button" type="submit">
          Filtrar
        </button>
        <Link className="button secondary" href="/purchase-requests">
          Limpar
        </Link>
        {/* Abre o formulário público em nova aba: a triagem não se perde e a
            URL fica à mão para copiar e compartilhar com quem vai solicitar. */}
        <a className="button gold" href="/solicitacao-compra" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} /> Nova solicitação
        </a>
      </form>

      <MobileSort columns={columns} sort={sort} onSort={sortBy} />

      <div className="table-wrap table-cards">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <SortableTh key={col.key} column={col.key} label={col.label} sort={sort} onSort={sortBy} />
              ))}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id}>
                <td data-label="Número">
                  <Link href={`/purchase-requests/${r.id}`} className="sku-badge">
                    {r.request_number}
                  </Link>
                </td>
                <td data-label="Solicitante">{r.requester_name}</td>
                <td data-label="Ministério / Depto.">{r.department ?? "-"}</td>
                <td data-label="Item">
                  <strong>{r.item_name}</strong>
                </td>
                <td data-label="Qtd.">{Number(r.quantity).toLocaleString("pt-BR")}</td>
                <td data-label="Recebida em">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                <td data-label="Status">
                  <span className={`badge pr-${r.status}`}>{purchaseRequestStatusLabels[r.status]}</span>
                </td>
                <td className="actions" data-label="Ações">
                  <Link className="button secondary" href={`/purchase-requests/${r.id}`}>
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter
        total={total}
        start={start}
        shown={visible.length}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageSize={setPageSize}
        onPage={setPage}
        noun="solicitações"
        nounSingular="solicitação"
      />
    </>
  );
}
