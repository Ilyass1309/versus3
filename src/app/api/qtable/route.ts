export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getQTable } from "@/lib/db";

export async function GET() {
  const { version, q } = await getQTable();
  return NextResponse.json({ version, q });
}
