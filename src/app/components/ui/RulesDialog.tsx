"use client";
import { useState, useEffect, ReactNode } from "react";

interface RulesDialogProps {
  trigger?: (open: () => void) => ReactNode;
  className?: string;
  open?: boolean;                   // mode contrôlé (optionnel)
  onOpenChange?: (open: boolean) => void;
  hideDefaultTrigger?: boolean;     // si true, masque le bouton par défaut
}

export function RulesDialog({
  trigger,
  className,
  open,
  onOpenChange,
  hideDefaultTrigger
}: RulesDialogProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? (open as boolean) : internalOpen;

  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
      onOpenChange?.(next);
    }
  };

  const openFn = () => setOpen(true);
  const closeFn = () => setOpen(false);

  // Accessibilité: fermer avec ESC
  useEffect(() => {
    if (!actualOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actualOpen]);

  return (
    <>
      {!hideDefaultTrigger &&
        (trigger ? (
          trigger(openFn)
        ) : (
          <button
            onClick={openFn}
            className={
              (className ?? "") +
              " px-3 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium tracking-wide"
            }
          >
            Règles
          </button>
        ))}

      {actualOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeFn}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-slate-900/80 shadow-2xl ring-1 ring-white/10">
            <div className="p-5 md:p-6">
              <h2 className="text-xl font-semibold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300">
                Règles du Duel
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Comprends les mécaniques avant de te lancer.
              </p>

              <div className="space-y-4 text-sm leading-relaxed text-slate-300">
                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Actions</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Attaque: dépense ta charge ({">"}=1) → dégâts = 8 × charge dépensée.</li>
                    <li>Défense: réduit de moitié (arrondi haut) les dégâts entrants.</li>
                    <li>Charge: +1 charge (max 3).</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Tour</h3>
                  <p>Les deux joueurs choisissent simultanément. Les effets se résolvent ensuite.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Fin de partie</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>PV à 0 → KO.</li>
                    <li>KO simultané → nul.</li>
                    <li>Limite de tours atteinte → comparaison des PV.</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Conseils</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Accumule pour menacer une frappe.</li>
                    <li>Défends quand tu anticipes une grosse attaque.</li>
                    <li>Forcer l’adversaire à gaspiller ses charges est rentable.</li>
                  </ul>
                </section>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeFn}
                  className="px-4 py-1.5 rounded bg-slate-700/60 hover:bg-slate-600 text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}