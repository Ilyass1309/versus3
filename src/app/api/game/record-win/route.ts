import { NextResponse } from "next/server";
import { getUserBySession } from "@/lib/db";
import { incrementAuthedPlayerWin } from "@/lib/db/scores";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";
    // log cookie header (masque le token partiellement pour sécurité)
    const maskedCookie = cookieHeader.replace(/(session|token|next-auth.session-token)=([^;]+)/g, (_, k, v) =>
      `${k}=${String(v).slice(0, 6)}…${String(v).slice(-6)}`
    );
    // court log pour identifier la requête
    // eslint-disable-next-line no-console
    console.log("[record-win] POST received, cookies:", maskedCookie);

    // adapte le nom du cookie si besoin (session, token, auth, ...)
    const m = cookieHeader.match(/(?:session|token|next-auth.session-token)=([^;]+)/);
    const token = m ? m[1] : null;
    // eslint-disable-next-line no-console
    console.log("[record-win] token present:", Boolean(token));

    const user = token ? await getUserBySession(token) : null;
    // log user resolved from session (id + nickname if present)
    // eslint-disable-next-line no-console
    console.log("[record-win] resolved user:", user ? { id: user.id, nickname: user.nickname } : null);

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    // log before increment
    // eslint-disable-next-line no-console
    console.log("[record-win] incrementing win for userId:", user.id);

    await incrementAuthedPlayerWin(user.id);

    // eslint-disable-next-line no-console
    console.log("[record-win] increment done for userId:", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("record-win error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}