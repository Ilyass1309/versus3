import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const top = await getLeaderboard(15);
    return NextResponse.json({ top });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}