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
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Não foi possível entrar.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Inventário Alive</h1>
        <p className="muted">Acesso interno por usuário e senha.</p>
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input id="username" name="username" autoComplete="username" required />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="button" type="submit" disabled={loading} style={{ width: "100%", marginTop: 18 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
