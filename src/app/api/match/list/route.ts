import { NextResponse } from "next/server";
import { listOpenMatches } from "@/lib/match-store";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function GET() {
  const rooms = await listOpenMatches(50);
  return NextResponse.json({ rooms });
}