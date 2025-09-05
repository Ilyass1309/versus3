import { NextResponse } from "next/server";
import { incrementPlayerWin } from "@/lib/db";

export const runtime = "nodejs";

interface Body {
  nickname?: string;
  result?: "player" | "ai" | "draw";
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json().catch(() => ({}));
    if (!body.nickname || typeof body.nickname !== "string") {
      return NextResponse.json({ error: "nickname required" }, { status: 400 });
    }
    if (body.result === "player") {
      await incrementPlayerWin(body.nickname);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}