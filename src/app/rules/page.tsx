"use client";
import { RulesDialog } from "@/app/components/ui/RulesDialog";
import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="min-h-dvh px-6 py-10 bg-slate-950/95 text-slate-200">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-fuchsia-300 mb-6">
          Règles du Jeu
        </h1>
        <p className="text-slate-400 mb-8">
          Cette page récapitule les mécaniques de base. Tu peux aussi afficher cette aide en jeu via le bouton Règles accessible depuis l&apos;accueil ou la partie.
        </p>
        <div className="border border-white/10 rounded-xl p-6 bg-slate-900/60 backdrop-blur">
          <RulesDialog
            trigger={(open) => (
              <button
                onClick={open}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium mb-4"
              >
                Ouvrir le guide interactif
              </button>
            )}
          />
          <p className="text-xs text-slate-500">
            Le pop-up est le même composant que celui accessible depuis l&apos;accueil ou la partie.
          </p>
        </div>
        <div className="mt-10">
          <Link
            href="/"
            className="inline-block text-sm text-indigo-300 hover:text-indigo-200 underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}