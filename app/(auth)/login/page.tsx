"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Não foi possível entrar."); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <form className="login-card" onSubmit={submit}>
        {/* Brand mark */}
        <div className="login-logo">
          <span className="alive">ALIVE</span>
          <span className="church">CHURCH</span>
          <span className="system">Sistema de Inventário</span>
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="username">Usuário</label>
          <input id="username" name="username" autoComplete="username" required placeholder="seu.usuario" />
        </div>

        <div className="field" style={{ marginBottom: 24 }}>
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </div>

        <button
          className="button"
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "12px", fontSize: "14px", letterSpacing: ".04em" }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--muted)" }}>
          Acesso restrito à equipe interna
        </p>
      </form>
    </main>
  );
}
