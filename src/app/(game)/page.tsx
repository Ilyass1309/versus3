"use client";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import GamePage from "../page";

export default function GameEntry() {
  const { nickname } = usePlayer();
  const r = useRouter();
  useEffect(() => {
    if (!nickname) r.replace("/nickname");
  }, [nickname, r]);
  if (!nickname) return null;
  return <GamePage />;
}