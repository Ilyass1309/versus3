import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (token) {
    await deleteSession(token).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", expires: new Date(0) });
  return res;
}