"use client";

import { conservationLabels, conservationStatuses, itemStatuses, statusLabels } from "@/lib/constants";

type Sector = { id: string; name: string };
type Subcategory = { id: string; sector_id: string; name: string };

export function ReportsFilters({ sectors, subcategories }: { sectors: Sector[]; subcategories: Subcategory[] }) {
  function exportCsv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => {
      if (value) params.set(key, String(value));
    });
    window.location.href = `/api/reports/export?${params.toString()}`;
  }

  return (
    <form className="panel toolbar" onSubmit={exportCsv}>
      <div className="field"><label>Setor</label><select name="sector_id"><option value="">Todos</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="field"><label>Subcategoria</label><select name="subcategory_id"><option value="">Todas</option>{subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="field"><label>Estado</label><select name="conservation_status"><option value="">Todos</option>{conservationStatuses.map((s) => <option key={s} value={s}>{conservationLabels[s]}</option>)}</select></div>
      <div className="field"><label>Status</label><select name="status"><option value="">Todos</option>{itemStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
      <div className="field"><label>Responsável</label><input name="responsible_name" /></div>
      <div className="field"><label>Localização</label><input name="location" /></div>
      <button className="button" type="submit">Exportar CSV</button>
    </form>
  );
}
