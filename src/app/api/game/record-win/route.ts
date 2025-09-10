import { NextResponse } from "next/server";
import { getUserBySession } from "@/lib/db";
import { incrementAuthedPlayerWin } from "@/lib/db/scores";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    // adapte le nom du cookie si besoin (session, token, auth, ...)
    const m = cookieHeader.match(/(?:session|token|next-auth.session-token)=([^;]+)/);
    const token = m ? m[1] : null;

    const user = token ? await getUserBySession(token) : null;
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    await incrementAuthedPlayerWin(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("record-win error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}