"use client";
import { useState, useEffect, ReactNode, useCallback } from "react";

interface RulesDialogProps {
  trigger?: (open: () => void) => ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideDefaultTrigger?: boolean;
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

  const setOpen = useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const openFn = useCallback(() => setOpen(true), [setOpen]);
  const closeFn = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!actualOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actualOpen, closeFn]);

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
              " px-3 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium"
            }
          >
            Rules
          </button>
        ))}
      {actualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeFn} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-slate-900/85 shadow-xl">
            <div className="p-5 md:p-6 text-sm text-slate-300 space-y-4">
              <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300">
                Rules du Duel
              </h2>
              <section>
                <h3 className="font-semibold text-indigo-300 mb-1">Objective</h3>
                <p>Win by reducing your opponent's HP to zero.</p>
              </section>
              <section>
                <h3 className="font-semibold text-indigo-300 mb-1">Actions</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Attack: deals damage.</li>
                  <li>Defend: reduces incoming damage.</li>
                  <li>Charge: increases energy for future turns.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-indigo-300 mb-1">Déroulement</h3>
                <p>Choix simultané, puis résolution. Planifie tes menaces.</p>
              </section>
              <section>
                <h3 className="font-semibold text-indigo-300 mb-1">Fin</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>PV ≤ 0 → KO.</li>
                  <li>KO simultané → nul.</li>
                  <li>Limite de tours → compare les PV.</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-indigo-300 mb-1">Conseils</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Accumule avant une grosse frappe.</li>
                  <li>Défends quand l’adversaire est chargé.</li>
                  <li>Fais gaspiller ses charges.</li>
                </ul>
              </section>
              <div className="flex justify-end pt-2">
                <button
                  onClick={closeFn}
                  className="px-4 py-1.5 rounded bg-slate-700/60 hover:bg-slate-600 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}