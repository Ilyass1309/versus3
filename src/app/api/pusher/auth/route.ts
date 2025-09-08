import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let socket_id: string | undefined;
    let channel_name: string | undefined;

    if (ct.includes("application/json")) {
      const body = await req.json();
      socket_id = body.socket_id;
      channel_name = body.channel_name;
    } else {
      const form = await req.formData();
      socket_id = form.get("socket_id")?.toString();
      channel_name = form.get("channel_name")?.toString();
    }

    if (!socket_id || !channel_name) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const auth = pusherServer.authorizeChannel(socket_id, channel_name);
    return NextResponse.json(auth);
  } catch (e) {
    console.error("[pusher/auth]", (e as Error).message);
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }
}