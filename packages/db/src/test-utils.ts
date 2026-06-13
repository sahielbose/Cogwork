import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./client";
import { schema } from "./schema";

/**
 * Build a fresh, isolated, in-memory Postgres (pglite — real Postgres compiled
 * to WASM) with the full schema applied via the generated migrations. Used by
 * the green-gate test suite so DB tests never depend on Docker. The query API
 * is identical to the postgres.js client, so the instance is used as a `Db`.
 */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
  await migrate(db, { migrationsFolder });
  return {
    db: db as unknown as Db,
    close: async () => {
      await client.close();
    },
  };
}
