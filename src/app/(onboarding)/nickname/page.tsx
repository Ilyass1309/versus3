"use client";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Dice5 } from "lucide-react";

const RX = /^[a-zA-Z0-9_]{3,16}$/;
const IDEAS = ["Nova", "Astra", "Pulse", "Flux", "Ilya", "Zenon", "Nyx_", "Rift77"] as const;

export default function NicknamePage() {
  const { nickname, setNickname } = usePlayer();
  const r = useRouter();
  const [value, setValue] = useState<string>(""); // valeur toujours string
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (typeof nickname === "string") setValue(nickname);
  }, [nickname]);

  useEffect(() => {
    if (nickname) r.replace("/game");
  }, [nickname, r]);

  const valid = RX.test(value);
  const error = touched && !valid ? "3–16 caractères alphanum ou underscore." : "";

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    setNickname(value);
    r.push("/game");
  }

  function rand() {
    const pick =
      IDEAS[Math.floor(Math.random() * IDEAS.length)] ?? "Player";
    setValue(pick);          // pick est toujours string
    setTouched(true);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#1e1b4b,#020617_70%)] text-slate-100 px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-[0_0_20px_-2px_#6366f155]"
      >
        <h2 className="text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300">
          Choisis ton nom
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Il sera visible dans la partie. Local seulement.
        </p>
        <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-slate-300">
          Pseudo
          <input
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={!valid}
            aria-describedby="nick-error"
            maxLength={16}
            className="mt-2 w-full rounded-lg bg-slate-900/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-indigo-400/60"
            placeholder="Ex: Nova"
            autoFocus
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={rand}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 transition focus:outline-none focus-visible:ring ring-fuchsia-400/50"
          >
            <Dice5 size={14} />
            Aléatoire
          </button>
          {error && (
            <p id="nick-error" className="text-[11px] text-rose-400">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2.5 text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring ring-indigo-400/60 shadow hover:brightness-110"
        >
          Continuer
        </button>
      </motion.form>
    </div>
  );
}