"use client";
import React from "react";
import type { Room } from "@/types/lobby";

type Props = {
  myNick: string | null;
  hasOwnRoom: boolean;
  roomLoading: boolean;
  visibleRooms: Room[];
  onCreate: () => Promise<void>;
  onQuickJoin: () => void;
  onDeleteOwn: () => Promise<void>;
  message?: string | null;
};

export const LobbyControls: React.FC<Props> = ({ myNick, hasOwnRoom, roomLoading, visibleRooms, onCreate, onQuickJoin, onDeleteOwn, message }) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button
          onClick={() => void onCreate()}
          disabled={roomLoading || hasOwnRoom}
          aria-busy={roomLoading}
          className="px-4 py-2 rounded bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50"
        >
          {roomLoading ? "Chargement..." : "Créer une partie"}
        </button>

        <button
          onClick={() => {
            const first = visibleRooms[0];
            if (first) onQuickJoin();
            else alert("Aucune salle ouverte pour rejoindre");
          }}
          disabled={roomLoading || hasOwnRoom || visibleRooms.length === 0}
          aria-busy={roomLoading}
          className="px-4 py-2 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600 disabled:opacity-50"
        >
          {roomLoading ? "Chargement..." : "Rejoindre une partie"}
        </button>

        {hasOwnRoom && (
          <button
            onClick={() => void onDeleteOwn()}
            disabled={roomLoading}
            aria-busy={roomLoading}
            className="px-4 py-2 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            Supprimer ma salle
          </button>
        )}
      </div>

      {message && <div className="text-sm text-rose-400 mb-4">{message}</div>}
    </div>
  );
};