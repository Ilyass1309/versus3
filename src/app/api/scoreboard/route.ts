import { NextResponse } from "next/server";
import { getTopPlayers } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const top = await getTopPlayers(15);
    return NextResponse.json({ top });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}