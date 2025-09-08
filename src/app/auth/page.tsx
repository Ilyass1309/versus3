"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/app/providers/PlayerProvider";

export default function AuthPage() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();
  const { setAuth } = usePlayer();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setErr("Nom requis");
      return;
    }
    const j = await res.json();
    setAuth(j.token, j.user);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm p-6 rounded-xl border border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-semibold mb-4">Connexion</h1>
        <label className="block text-sm mb-2">Pseudo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none"
          placeholder="Ton pseudo"
        />
        {err && <div className="text-rose-400 text-xs mt-2">{err}</div>}
        <button type="submit" className="mt-4 w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500">
          Continuer
        </button>
      </form>
    </div>
  );
}