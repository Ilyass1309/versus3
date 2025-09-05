"use client";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const { user, setUser } = usePlayer();
  const r = useRouter();
  const [mode, setMode] = useState<"login"|"register">("register");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) r.replace("/game");
  }, [user, r]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!nickname || !password) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password })
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "error");
      } else {
        setUser(json.user);
        r.push("/game");
      }
    } catch {
      setErr("network");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8"
      >
        <h1 className="text-2xl font-bold">
          {mode === "register" ? "Créer un compte" : "Connexion"}
        </h1>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide">
            Pseudo
            <input
              value={nickname}
              onChange={e=>setNickname(e.target.value)}
              maxLength={16}
              className="mt-1 w-full rounded bg-slate-900/50 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50"
              autoComplete="username"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="mt-1 w-full rounded bg-slate-900/50 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {err && <p className="text-[11px] text-rose-400">{err}</p>}
        </div>
        <button
          type="submit"
          disabled={busy || nickname.length < 3 || password.length < 6}
          className="w-full rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "..." : (mode === "register" ? "S'inscrire" : "Se connecter")}
        </button>
        <button
          type="button"
          onClick={() => { setMode(m => m==="register"?"login":"register"); setErr(""); }}
          className="w-full text-[11px] text-slate-400 hover:text-slate-200"
        >
          {mode === "register" ? "Déjà un compte ? Connexion" : "Pas de compte ? Inscription"}
        </button>
      </form>
    </div>
  );
}