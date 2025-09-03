import { NextResponse } from "next/server";

// In-memory (remplacer par DB si besoin)
let hyper = { alpha: 0.18, gamma: 0.98, epsilon: 0.05 };

export async function GET() {
  return NextResponse.json(hyper);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body.alpha === "number") hyper.alpha = body.alpha;
    if (typeof body.gamma === "number") hyper.gamma = body.gamma;
    if (typeof body.epsilon === "number") hyper.epsilon = body.epsilon;
    return NextResponse.json({ ok: true, hyper });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}