import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventário Alive Church",
  description: "Controle interno de bens da Alive Church",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
