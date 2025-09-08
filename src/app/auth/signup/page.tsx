"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/app/providers/PlayerProvider";

export default function SignupPage() {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();
  const { setAuth } = usePlayer();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, password }),
    });
    if (!res.ok) {
      setErr("Pseudo déjà utilisé ou données invalides.");
      return;
    }
    const j = await res.json();
    setAuth(j.token, j.user);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm p-6 rounded-xl border border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-semibold mb-4">Créer un compte</h1>
        <label className="block text-sm mb-1">Pseudo</label>
        <input className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 mb-3"
          value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <label className="block text-sm mb-1">Mot de passe</label>
        <input type="password" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className="text-rose-400 text-xs mt-2">{err}</div>}
        <button type="submit" className="mt-4 w-full py-2 rounded bg-sky-600 hover:bg-sky-500">S&apos;inscrire</button>
        <div className="text-xs text-slate-400 mt-3">
          Déjà un compte ? <a href="/auth/login" className="text-sky-400 hover:underline">Se connecter</a>
        </div>
      </form>
    </div>
  );
}