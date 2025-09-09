"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/app/providers/PlayerProvider";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setUser } = usePlayer();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Use the onboarding nickname flow instead of API login
    router.push("/nickname");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm p-6 rounded-xl border border-slate-800 bg-slate-900/60"
      >
        <h1 className="text-lg font-semibold mb-4">Se connecter</h1>

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
          className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-medium"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}