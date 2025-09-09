"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/app/providers/PlayerProvider";

export default function SignupPage() {
  const router = useRouter();
  const { setAuth, setUser } = usePlayer();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Impossible de créer le compte");
        setLoading(false);
        return;
      }
      if (body?.token && body?.user) {
        setAuth(body.token, body.user);
      } else if (body?.user) {
        setUser(body.user);
      } else {
        setUser({ id: body?.id ?? "", nickname });
      }
      router.push("/game");
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm p-6 rounded-xl border border-slate-800 bg-slate-900/60"
      >
        <h1 className="text-lg font-semibold mb-4">Créer un compte</h1>

        <label className="text-xs text-slate-400">Pseudo</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full mb-3 mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none"
          placeholder="Ton pseudo"
          required
        />

        <label className="text-xs text-slate-400">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none"
          placeholder="Mot de passe"
          required
        />

        {error && <div className="text-rose-400 text-sm mb-2">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
        >
          {loading ? "Création..." : "Créer un compte"}
        </button>
      </form>
    </div>
  );
}