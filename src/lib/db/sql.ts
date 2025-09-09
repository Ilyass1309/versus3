 // connexion + helper sql<T>
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

// client taggé Neon (serverless)
const _sql = neon(DATABASE_URL);

/** Template tag SQL typé qui retourne directement les rows. */
export async function sql<T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  try {
    const res = await _sql(strings, ...values);
    return res as unknown as T[];
  } catch (err) {
    console.error("[SQL ERROR]", err);
    throw err;
  }
}
