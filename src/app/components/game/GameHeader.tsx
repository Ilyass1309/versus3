"use client";
import { useGame } from "./GameShell";
import { usePlayer } from "@/app/providers/PlayerProvider";
import Link from "next/link";
import { RulesDialog } from "@/app/components/ui/RulesDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface GameHeaderProps {
  rulesOpen: boolean;
  onRulesOpenChange(open: boolean): void;
}

export function GameHeader({ rulesOpen, onRulesOpenChange }: GameHeaderProps) {
  const { engine } = useGame();
  const { user, setUser } = usePlayer(); 
  const nickname = user?.nickname;
  const status = engine.serverStatus;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const r = useRouter();

  const toggleMenu = useCallback(() => {
    setMenuOpen((o) => !o);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    if (menuOpen) document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    closeMenu();
    r.push("/nickname");
    // option: await refresh();
  }

  return (
    <header className="w-full mb-2 flex flex-col gap-4 md:gap-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <h1
              className="relative font-extrabold tracking-tight text-3xl md:text-4xl leading-none"
              aria-label="Versus III"
            >
              <span className="inline-block bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_8px_rgba(236,72,153,0.35)]">
                VERSUS <span className="text-white/70">III</span>
              </span>
            </h1>
            <div className="absolute -inset-2 blur-2xl bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/10 to-rose-500/20 glow-pulse pointer-events-none" />
          </div>
          <span
            className={`text-[10px] px-2 py-1 rounded-full border uppercase tracking-wide ${
              status === "ok"
                ? "border-emerald-400/40 text-emerald-300"
                : status === "error"
                ? "border-rose-400/40 text-rose-300"
                : "border-slate-400/30 text-slate-400/80"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/stats"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
          >
            Stats
          </Link>
          <Link
            href="/multiplayer"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
          >
            Multiplayer
          </Link>
          <RulesDialog
            open={rulesOpen}
            onOpenChange={onRulesOpenChange}
            trigger={(open) => (
              <button
                onClick={open}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
              >
                Rules
              </button>
            )}
          />
          {nickname ? (
             <div className="relative" ref={menuRef}>
               <button
                 onClick={toggleMenu}
                 className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
                 aria-haspopup="true"
                 aria-expanded={menuOpen}
               >
                {nickname}
               </button>
               {menuOpen && (
                 <div
                   className="absolute right-0 mt-2 w-40 rounded-lg border border-white/10 bg-slate-900/90 backdrop-blur px-2 py-2 shadow-lg z-50"
                   role="menu"
                 >
                  <div className="px-3 py-2 text-[11px] text-slate-300/90 border-b border-white/10 mb-1">
                    Profil: <span className="font-medium">{nickname}</span>
                  </div>
                   <button
                     onClick={logout}
                     className="w-full text-left text-[11px] px-3 py-2 rounded-md bg-white/5 hover:bg-rose-500/20 hover:text-rose-200 transition"
                     role="menuitem"
                   >
                    Déconnexion
                   </button>
                   <button
                     onClick={closeMenu}
                     className="w-full mt-1 text-left text-[11px] px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 transition"
                     role="menuitem"
                   >
                     Cancel
                   </button>
                 </div>
               )}
             </div>
          ) : (
            <Link
              href="/nickname"
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition focus:outline-none focus-visible:ring ring-indigo-400/60"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
      <p className="text-[11px] md:text-xs text-slate-400 tracking-wide uppercase">
        Tactical Duel • Charge / Defend / Strike • Adaptive Intelligence
      </p>
    </header>
  );
}