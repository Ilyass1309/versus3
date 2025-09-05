// Simple PG helper (pool + tagged template + client.sql) to satisfy db.ts usage.
// Install dependency first if absent: npm i pg
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[pg] DATABASE_URL non défini – les requêtes échoueront.");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
});

type SQLFn = <T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<QueryResult<T>>;

function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return text;
}

const baseSql: SQLFn = <T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  const text = buildQuery(strings, values);
  return pool.query<T>(text, values as any[]);
};

async function connect() {
  const client: PoolClient = await pool.connect();
  const clientSql: SQLFn = <T extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    const text = buildQuery(strings, values);
    return client.query<T>(text, values as any[]);
  };
  return {
    sql: clientSql,
    release: () => {
      try {
        client.release();
      } catch {}
    },
  };
}

// Exporte un objet similaire à ce que db.ts attend (sql tag + connect()).
export const sql = Object.assign(baseSql, { connect });