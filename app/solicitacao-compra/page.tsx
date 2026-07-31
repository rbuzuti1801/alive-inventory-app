import type { Metadata } from "next";
import { PurchaseRequestForm } from "@/components/PurchaseRequestForm";

export const metadata: Metadata = {
  title: "Solicitação de Compra — Alive Church",
  description: "Envie uma solicitação de compra para a Alive Church",
};

// Página PÚBLICA (liberada no middleware): qualquer pessoa com o link envia uma
// solicitação de compra. Mesma casca visual da consulta pública de QR
// (.public-page / .public-card), sem menu e sem sessão.
export default function PurchaseRequestPublicPage() {
  return (
    <main className="public-page">
      <div className="public-card public-card-wide">
        <div className="public-brand">
          <span className="alive">ALIVE</span> <span className="church">CHURCH</span>
          <span className="system">Solicitação de Compra</span>
        </div>

        <h1 className="public-product-name">Solicitação de Compra</h1>
        <p className="muted" style={{ margin: 0 }}>
          Preencha os dados abaixo. Após o envio você receberá o número da solicitação e a equipe responsável fará a
          análise.
        </p>

        <PurchaseRequestForm />
      </div>
    </main>
  );
}
