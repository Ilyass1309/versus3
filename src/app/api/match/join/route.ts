import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { matchChannel, lobbyChannel } from "@/lib/pusher-channel";
import { getMatch, setMatch, removeFromIndex } from "@/lib/match-store";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { matchId, playerId, name } = body as { matchId: string; playerId?: string; name?: string };

  // basic request log (no sensitive data)
  // eslint-disable-next-line no-console
  console.log("[match/join] incoming", { matchId, playerId: Boolean(playerId), name });

  const m = await getMatch(matchId);
  if (!m) {
    // eslint-disable-next-line no-console
    console.log("[match/join] match not found", { matchId });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // log current players
  // eslint-disable-next-line no-console
  console.log("[match/join] before players:", { matchId, players: m.players });

  // Normalize identifier: prefer provided nickname (name) when present, else use playerId.
  const identifier = (typeof name === "string" && name.length > 0) ? name : playerId;
  if (!identifier) {
    // eslint-disable-next-line no-console
    console.log("[match/join] missing identifier", { matchId, playerId, name });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let changed = false;
  if (!m.players.includes(identifier)) {
    if (m.players.length >= 2) {
      // eslint-disable-next-line no-console
      console.log("[match/join] room full, reject join", { matchId, identifier, players: m.players });
      return NextResponse.json({ error: "full" }, { status: 409 });
    }
    m.players.push(identifier);
    changed = true;
    // eslint-disable-next-line no-console
    console.log("[match/join] player added", { matchId, identifier, playersAfterAdd: m.players });
  } else {
    // eslint-disable-next-line no-console
    console.log("[match/join] player already in room", { matchId, identifier });
  }
  if (changed) await setMatch(m);

  // Broadcast état public
  const state = {
    id: m.id,
    turn: m.turn,
    phase: m.phase,
    players: m.players,
    actions: Object.keys(m.actions),
    hp: { p: m.state.pHP, e: m.state.eHP },
    charge: { p: m.state.pCharge, e: m.state.eCharge },
  };

  try {
    // eslint-disable-next-line no-console
    console.log("[match/join] triggering pusher state and lobby updates", { matchId, players: m.players.length });
    await pusherServer.trigger(matchChannel(matchId), "state", state);
    // Notify creator(s) explicitly that a player joined
    try {
      await pusherServer.trigger(matchChannel(matchId), "player_joined", { id: identifier, name: identifier });
      console.log("[match/join] triggered player_joined", { matchId, identifier });
    } catch (e) {
      console.warn("[match/join] player_joined trigger failed", e);
    }
    // lobby update
    const count = m.players.length;
    if (count >= 2) {
      await removeFromIndex(m.id);
      await pusherServer.trigger(lobbyChannel, "full", { id: m.id });
      // eslint-disable-next-line no-console
      console.log("[match/join] room is now full, triggered full", { matchId });
    } else {
      await pusherServer.trigger(lobbyChannel, "updated", { id: m.id, players: count });
      // eslint-disable-next-line no-console
      console.log("[match/join] lobby updated", { matchId, players: count });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[match/join] pusher trigger error", err);
  }

  // final log
  // eslint-disable-next-line no-console
  console.log("[match/join] finished", { matchId, players: m.players });

  return NextResponse.json({ ok: true, state });
}