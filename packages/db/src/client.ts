import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

/**
 * The canonical Cogwork database type. Test code builds an embedded pglite
 * instance and casts it to this type (identical query API) — see test-utils.
 */
export type Db = PostgresJsDatabase<typeof schema>;

let _client: ReturnType<typeof postgres> | null = null;
let _db: Db | null = null;

/** Lazily create (and memoize) the Postgres-backed client from DATABASE_URL. */
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and start Postgres (docker compose up -d).",
    );
  }
  _client = postgres(url, { max: 10 });
  _db = drizzle(_client, { schema });
  return _db;
}

/** Close the pooled connection (graceful shutdown / scripts). */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
    _db = null;
  }
}
