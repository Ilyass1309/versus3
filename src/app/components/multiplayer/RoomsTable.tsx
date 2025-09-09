"use client";
import React from "react";
import type { Room } from "@/types/lobby";

type Props = {
  rooms: Room[];
  roomsLoading: boolean;
  maxPlayers: number;
  roomLoading: boolean;
  onJoin: (id: string) => void;
  hasOwnRoom: boolean;
};

export const RoomsTable: React.FC<Props> = ({ rooms, roomsLoading, maxPlayers, roomLoading, onJoin, hasOwnRoom }) => {
  return (
    <section className="mb-6 rounded-md border border-slate-800 p-4 bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-slate-100">Salles disponibles</h3>
        <div className="text-sm text-slate-400">{roomsLoading ? "Chargement..." : `${rooms.length} salle(s)`}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-left">
              <th className="pb-2">Hôte</th>
              <th className="pb-2">Joueurs</th>
              <th className="pb-2">Statut</th>
              <th className="pb-2">Code</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-400">Aucune salle</td>
              </tr>
            ) : (
              rooms.map((r) => {
                const players = r.players ?? [];
                const host = r.host || (players[0] ?? "invité");
                const status = (r.status ?? "open").toString();
                const canJoin = status.toLowerCase() !== "closed" && players.length < maxPlayers && !hasOwnRoom;

                return (
                  <tr key={String(r.id)} className="border-t border-slate-800">
                    <td className="py-3">{host}</td>
                    <td className="py-3">{players.length}/{maxPlayers}</td>
                    <td className="py-3">{status}</td>
                    <td className="py-3 font-mono">{r.id}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => canJoin && onJoin(String(r.id))}
                        disabled={!canJoin || roomLoading}
                        aria-busy={roomLoading}
                        className="px-3 py-1 rounded bg-emerald-500 text-black font-medium hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {roomLoading ? "..." : "Rejoindre"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};