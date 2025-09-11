import { NextResponse } from "next/server";
import { findUserByNickname, incrementAuthedPlayerWin } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";

    // parse cookies and prefer a "nickname" cookie if present
    const cookiesMap = (cookieHeader || "")
      .split(";")
      .map((s) => s.split("="))
      .reduce<Record<string, string>>((acc, [k, v]) => {
        if (!k) return acc;
        acc[k.trim()] = typeof v === "undefined" ? "" : decodeURIComponent(v.trim());
        return acc;
      }, {});

    const nicknameFromCookie = cookiesMap["nickname"] ?? cookiesMap["nick"] ?? null;
    let user: { id: number; nickname: string } | null = null;
    if (nicknameFromCookie) {
      const found = await findUserByNickname(nicknameFromCookie);
      if (found?.id) user = { id: found.id, nickname: nicknameFromCookie };
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    await incrementAuthedPlayerWin(user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}