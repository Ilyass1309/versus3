import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  const { socket_id, channel_name } = await req.json();
  if (!socket_id || !channel_name) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const auth = pusherServer.authorizeChannel(socket_id, channel_name);
  return NextResponse.json(auth);
}