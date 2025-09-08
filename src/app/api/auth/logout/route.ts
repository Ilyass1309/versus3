import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST() {
  // Ici on ne gère que le client-side storage, donc on répond 200.
  return NextResponse.json({ ok: true });
}