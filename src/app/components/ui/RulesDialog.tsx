"use client";
import { useState, ReactNode } from "react";

interface RulesDialogProps {
  trigger?: (open: () => void) => ReactNode;
  className?: string;
}

export function RulesDialog({ trigger, className }: RulesDialogProps) {
  const [open, setOpen] = useState(false);
  const openFn = () => setOpen(true);
  const closeFn = () => setOpen(false);

  return (
    <>
      {trigger ? (
        trigger(openFn)
      ) : (
        <button
          onClick={openFn}
          className={className + " px-3 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium tracking-wide"}
        >
          Règles
        </button>
      )}
      {open && (
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
                Comprendre le cycle pour mieux exploiter l’IA.
              </p>

              <div className="space-y-4 text-sm leading-relaxed">
                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Actions</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li><span className="text-indigo-200 font-medium">Attaque</span> : dépense ta charge (1 à tout) → dégâts = 8 × charge dépensée.</li>
                    <li><span className="text-indigo-200 font-medium">Défense</span> : si tu es attaqué, dégâts subis divisés par 2 (arrondi haut).</li>
                    <li><span className="text-indigo-200 font-medium">Charge</span> : +1 charge (max 3).</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Charges & Dégâts</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Tu choisis l’action avant de voir celle de l’adversaire (résolution simultanée).</li>
                    <li>Attaquer à 0 charge = impossible (il faut au moins 1).</li>
                    <li>Conserver tes charges permet une frappe massive plus tard.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Conditions de fin</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>PV ≤ 0: KO immédiat.</li>
                    <li>KO simultané: match nul.</li>
                    <li>Limite de tours atteinte: comparaison des PV restants.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">Stratégie de base</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Observer le rythme: alterne charge / défense pour survivre.</li>
                    <li>Ne vide pas toujours tout: menace {">"} action.</li>
                    <li>Forcer l’IA à gaspiller ses charges avec des défenses.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-indigo-300 mb-1">IA & Apprentissage</h3>
                  <p className="text-slate-300">
                    L’IA utilise une Q-table: chaque état (HP, charge, tour…) associe une valeur à chaque action. Elle explore au début (epsilon élevé) puis exploite ses meilleures estimations.
                  </p>
                </section>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeFn}
                  className="px-4 py-1.5 rounded bg-slate-700/60 hover:bg-slate-600 text-sm"
                >
                  Fermer
                </button>
                <a
                  href="/game"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium"
                  onClick={closeFn}
                >
                  Jouer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}