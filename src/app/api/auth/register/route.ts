import { NextResponse } from "next/server";
import { registerUser, createSession } from "@/lib/db";
import { sql } from "@/lib/pg";

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
    console.log("[REGISTER] payload:", { nickname: typeof nickname, password: typeof password });

    if (typeof nickname !== "string" || typeof password !== "string") {
      console.warn("[REGISTER] invalid payload");
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(nickname)) {
      console.warn("[REGISTER] invalid nickname:", nickname);
      return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
    }
    if (password.length < 6) {
      console.warn("[REGISTER] weak password");
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    // verify nickname does not already exist to avoid ON CONFLICT DB error
    try {
      const check = await sql`SELECT id FROM users WHERE nickname = ${nickname} LIMIT 1`;
      if (check.rowCount && check.rowCount > 0) {
        console.warn("[REGISTER] nickname taken:", nickname);
        return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
      }
    } catch (chkErr) {
      console.error("[REGISTER] check nickname error", chkErr);
      // continue - we'll attempt register and handle DB error below
    }

    console.log("[REGISTER] calling registerUser");
    const user = await registerUser(nickname, password);
    console.log("[REGISTER] registerUser ->", { id: user.id, nickname: user.nickname });

    console.log("[REGISTER] creating session for user:", user.id);
    const { token, expires } = await createSession(user.id);
    console.log("[REGISTER] createSession -> token present:", !!token, "expires:", expires);

    const res = NextResponse.json({ user: { id: user.id, nickname: user.nickname } });
    try {
      setSessionCookie(res, token, expires);
    } catch (cookieErr) {
      console.error("[REGISTER] cookie set failed:", cookieErr);
      return NextResponse.json({ error: "cookie_error", message: String(cookieErr) }, { status: 500 });
    }

    return res;
  } catch (err: unknown) {
    console.error("[REGISTER ERROR]", err);
    // map Postgres duplicate-key error to user-friendly response without using `any`
    let code: string | undefined;
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      if (typeof e.code === "string") code = e.code;
      else if (typeof e.pgCode === "string") code = e.pgCode;
    }
    if (code === "23505") {
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message === "nickname_taken") {
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}