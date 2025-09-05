import { NextResponse } from "next/server";
import { registerUser, createSession } from "@/lib/db";

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
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(nickname)) {
      return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }
    const user = await registerUser(nickname, password);
    const { token, expires } = await createSession(user.id);
    const res = NextResponse.json({ user: { id: user.id, nickname: user.nickname } });
    setSessionCookie(res, token, expires);
    return res;
  } catch (e: any) {
    if (e instanceof Error && e.message === "nickname_taken") {
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}