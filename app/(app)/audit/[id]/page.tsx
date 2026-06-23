import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadAuditProgress } from "@/lib/audit-server";
import { AuditRunner } from "@/components/AuditRunner";

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const progress = await loadAuditProgress(id);

  if (!progress) {
    return <div className="alert error">Auditoria não encontrada. <Link href="/audit">Voltar</Link></div>;
  }

  return <AuditRunner auditId={id} initial={progress} />;
}
