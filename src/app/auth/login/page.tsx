"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "login_failed");
        setLoading(false);
        return;
      }
      if (body?.token) localStorage.setItem("token", body.token);
      router.push("/game");
    } catch {
      setError("server_error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Se connecter</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Pseudo"
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="w-full p-2 border rounded"
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}