"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Ordenação + paginação client-side compartilhadas pelas listagens (Inventário e
// Estoque). As telas continuam donas dos seus filtros/busca — daqui saem apenas
// as linhas já ordenadas e fatiadas, mais o rodapé padrão.

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

/** Valor usado na comparação. Devolva o texto que aparece na tela (rótulo
 *  traduzido, não a chave interna) para a ordem bater com o que a pessoa lê. */
export type SortAccessors<T, K extends string> = Record<K, (row: T) => string | number>;

export function useTableSort<T, K extends string>(rows: T[], accessors: SortAccessors<T, K>, initial: SortState<K> = null) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    const get = accessors[sort.key];
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * factor;
    });
    // `accessors` é recriado a cada render nos callers; as funções são puras e
    // dependem só de `rows`, então basta observar rows/sort.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  /** Primeiro clique: crescente. Segundo na mesma coluna: decrescente. */
  function toggleSort(key: K) {
    setSort((prev) => (prev?.key === key && prev.dir === "asc" ? { key, dir: "desc" } : { key, dir: "asc" }));
  }

  return { sorted, sort, toggleSort };
}

export const pageSizes = [10, 20, 50, "todos"] as const;
export type PageSize = (typeof pageSizes)[number];

/** `resetKey` deve mudar sempre que busca/filtros mudarem — isso devolve a
 *  listagem à primeira página sem perder ordenação nem itens por página. */
export function usePagination<T>(rows: T[], resetKey: string, initialSize: PageSize = 20) {
  const [pageSize, setPageSize] = useState<PageSize>(initialSize);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [resetKey]);

  const total = rows.length;
  const perPage = pageSize === "todos" ? Math.max(total, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const visible = rows.slice(start, start + perPage);

  return { visible, total, start, page: currentPage, totalPages, pageSize, setPageSize, setPage };
}

/** Cabeçalho clicável. Passe `sort`/`onSort` do useTableSort. */
export function SortableTh<K extends string>({
  column, label, sort, onSort, className,
}: {
  column: K;
  label: string;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
}) {
  const active = sort?.key === column;
  return (
    <th className={[active ? "is-sorted" : "", className ?? ""].filter(Boolean).join(" ") || undefined} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button className="th-sort" type="button" onClick={() => onSort(column)}>
        {label}
        <span className="th-sort-arrow">
          {active && (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </span>
      </button>
    </th>
  );
}

/** Controle de ordenação para o mobile (card view), onde o cabeçalho da tabela
 *  fica oculto. Só aparece em telas pequenas (CSS .mobile-sort). Reaproveita o
 *  mesmo estado/toggle do useTableSort das listagens. */
export function MobileSort<K extends string>({
  columns, sort, onSort,
}: {
  columns: { key: K; label: string }[];
  sort: SortState<K>;
  onSort: (key: K) => void;
}) {
  const activeKey = sort?.key ?? columns[0]?.key;
  const dir = sort?.dir ?? "asc";
  return (
    <div className="mobile-sort">
      <label>
        Ordenar por
        <select
          value={activeKey}
          onChange={(e) => onSort(e.target.value as K)}
        >
          {columns.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </label>
      <button
        className="button secondary"
        type="button"
        onClick={() => onSort(activeKey)}
        aria-label={dir === "asc" ? "Ordem crescente — tocar para inverter" : "Ordem decrescente — tocar para inverter"}
      >
        {dir === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );
}

/** Rodapé: "Exibindo X–Y de Z itens" + itens por página + Anterior/Próxima. */
export function TableFooter({
  total, start, shown, page, totalPages, pageSize, onPageSize, onPage, noun = "itens", nounSingular = "item",
}: {
  total: number;
  start: number;
  shown: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  onPageSize: (size: PageSize) => void;
  onPage: (page: number) => void;
  noun?: string;
  nounSingular?: string;
}) {
  return (
    <div className="table-footer">
      <span className="muted">
        {total === 0
          ? `Nenhum ${nounSingular} encontrado`
          : `Exibindo ${start + 1}–${start + shown} de ${total} ${total === 1 ? nounSingular : noun}`}
      </span>

      <div className="table-footer-right">
        <label className="page-size">
          Itens por página:
          <select
            value={String(pageSize)}
            onChange={(e) => {
              const v = e.target.value;
              onPageSize(v === "todos" ? "todos" : (Number(v) as PageSize));
              onPage(1);
            }}
          >
            {pageSizes.map((s) => (
              <option key={String(s)} value={String(s)}>{s === "todos" ? "Todos" : s}</option>
            ))}
          </select>
        </label>

        {totalPages > 1 && (
          <div className="pager">
            <button className="button secondary" type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>Anterior</button>
            <span className="muted">Página {page} de {totalPages}</span>
            <button className="button secondary" type="button" disabled={page === totalPages} onClick={() => onPage(page + 1)}>Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
}
