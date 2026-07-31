"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import {
  MobileSort,
  SortableTh,
  TableFooter,
  useTableSort,
  usePagination,
  type SortAccessors,
} from "@/components/table-controls";
import { serviceOrderStatusLabels, serviceOrderStatuses, type ServiceOrderStatus } from "@/lib/constants";

export type ServiceOrderRow = {
  id: string;
  order_number: string | null;
  title: string;
  provider_name: string | null;
  responsible_name: string;
  department: string | null;
  service_value: number | null;
  status: ServiceOrderStatus;
  issued_at: string | null;
  created_at: string;
};

type SortKey = "order_number" | "title" | "provider_name" | "responsible_name" | "service_value" | "issued_at" | "status";

const columns: { key: SortKey; label: string }[] = [
  { key: "order_number", label: "Número" },
  { key: "title", label: "Serviço" },
  { key: "provider_name", label: "Prestador" },
  { key: "responsible_name", label: "Responsável interno" },
  { key: "service_value", label: "Valor" },
  { key: "issued_at", label: "Emissão" },
  { key: "status", label: "Status" },
];

const accessors: SortAccessors<ServiceOrderRow, SortKey> = {
  order_number: (o) => o.order_number ?? "",
  title: (o) => o.title,
  provider_name: (o) => o.provider_name ?? "",
  responsible_name: (o) => o.responsible_name,
  service_value: (o) => Number(o.service_value ?? 0),
  issued_at: (o) => o.issued_at ?? "",
  status: (o) => serviceOrderStatusLabels[o.status] ?? o.status,
};

function currency(value: number | null) {
  return value == null ? "-" : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServiceOrdersTable({ orders }: { orders: ServiceOrderRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sorted, sort, toggleSort } = useTableSort<ServiceOrderRow, SortKey>(orders, accessors, { key: "issued_at", dir: "desc" });
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
    router.push(`/service-orders?${params.toString()}`);
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
            placeholder="Número, serviço, prestador…"
            style={{ minWidth: 220 }}
          />
        </div>
        <div className="field">
          <label>Status</label>
          <select name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Todos</option>
            {serviceOrderStatuses.map((s) => (
              <option key={s} value={s}>
                {serviceOrderStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <button className="button" type="submit">
          Filtrar
        </button>
        <Link className="button secondary" href="/service-orders">
          Limpar
        </Link>
        <Link className="button gold" href="/service-orders/new">
          <Plus size={15} /> Nova ordem
        </Link>
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
                  Nenhuma ordem de serviço encontrada.
                </td>
              </tr>
            )}
            {visible.map((o) => (
              <tr key={o.id}>
                <td data-label="Número">
                  <Link href={`/service-orders/${o.id}`} className="sku-badge">
                    {o.order_number ?? "Rascunho"}
                  </Link>
                </td>
                <td data-label="Serviço">
                  <strong>{o.title}</strong>
                </td>
                <td data-label="Prestador">{o.provider_name ?? "-"}</td>
                <td data-label="Responsável interno">{o.responsible_name}</td>
                <td data-label="Valor">{currency(o.service_value)}</td>
                <td data-label="Emissão">{o.issued_at ? new Date(o.issued_at).toLocaleDateString("pt-BR") : "-"}</td>
                <td data-label="Status">
                  <span className={`badge so-${o.status}`}>{serviceOrderStatusLabels[o.status]}</span>
                </td>
                <td className="actions" data-label="Ações">
                  <Link className="button secondary" href={`/service-orders/${o.id}`}>
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
        noun="ordens"
        nounSingular="ordem"
      />
    </>
  );
}
