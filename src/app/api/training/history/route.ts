export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "training-history-francois.json");
    const raw = await fs.readFile(file, "utf-8").catch(()=> "[]");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return NextResponse.json({ points: [] });
    // Option: smoothing simple (client fera mieux)
    return NextResponse.json({ points: arr });
  } catch {
    return NextResponse.json({ points: [] });
  }
}