export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getQTable } from "@/lib/db";

export async function GET() {
  const { version, q } = await getQTable();
  const body = JSON.stringify({ version, q }, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="qtable-v${version}.json"`
    }
  });
}
