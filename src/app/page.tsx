import GameUI from "./components/GameUI";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Server-authoritative Q-learning (Next.js + Vercel Postgres)</h1>
      <p>Démo minimale — endpoints prêts pour intégrer votre UI/agent.</p>
      <GameUI />
      <p style={{ marginTop: 24, color: "#666" }}>
        Astuce : Vous pouvez poster vos épisodes réels depuis votre UI (actions de l’IA vs joueur),
        le serveur rejoue et met à jour la Q-table transactionnellement.
      </p>
    </main>
  );
}
