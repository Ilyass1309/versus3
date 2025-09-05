import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const socketId = form.get("socket_id") as string;
  const channel = form.get("channel_name") as string;
  // TODO: real auth. For now random user id.
  const userId = "u_" + Math.random().toString(36).slice(2, 10);
  const auth = pusherServer.authenticate(socketId, channel, {
    user_id: userId,
    user_info: { nickname: userId },
  });
  return NextResponse.json(auth);
}