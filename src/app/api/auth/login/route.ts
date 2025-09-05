import { NextResponse } from "next/server";
import { findUserByNickname, createSession } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function setSessionCookie(res: NextResponse, token: string, expires: Date) {
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires
  });
}

export async function POST(req: Request) {
  try {
    const { nickname, password } = await req.json().catch(() => ({}));
    if (typeof nickname !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    const user = await findUserByNickname(nickname);
    if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

    const { token, expires } = await createSession(user.id);
    const res = NextResponse.json({ user: { id: user.id, nickname } });
    setSessionCookie(res, token, expires);
    return res;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}