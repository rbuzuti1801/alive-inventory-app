import { requireUser } from "@/lib/auth";
import { QuickScan } from "@/components/QuickScan";

export default async function ScanPage() {
  await requireUser();
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Leitura de QR Code</h1>
          <p className="muted">Escaneie com leitor USB, câmera do celular ou tablet para localizar um item.</p>
        </div>
      </div>
      <QuickScan />
    </>
  );
}
