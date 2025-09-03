export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withLockedQTable } from "@/lib/db";

type Body = {
  q: Record<string, [number, number, number]>;
  version?: number;                // ignoré (la version serveur est source)
  mode?: "replace" | "merge";      // default "replace"
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json()) as Body;
  if (!json || typeof json !== "object" || typeof json.q !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const mode = json.mode ?? "replace";
  const imported = json.q;

  const result = await withLockedQTable((q) => {
    if (mode === "replace") {
      // Remplace complètement
      for (const k of Object.keys(q)) delete q[k];
      Object.assign(q, imported);
    } else {
      // Merge – remplace clé par clé
      Object.assign(q, imported);
    }
  });

  return NextResponse.json({ ok: true, version: result.version, size: Object.keys(result.q).length });
}
