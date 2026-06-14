import { z } from "zod";
import { defineAction, type Connector } from "../core/types";

/**
 * Postgres connector — fixture-backed (Phase 0–2). Connection-string auth.
 * `postgres.execute` is guarded: destructive DDL (DROP/TRUNCATE/ALTER) is
 * rejected at validation time.
 */

const DESTRUCTIVE = /\b(drop|truncate|alter)\b/i;

export const postgresQuery = defineAction({
  name: "postgres.query",
  description: "Run a read-only SQL query and return rows.",
  inputSchema: z.object({ sql: z.string(), params: z.array(z.unknown()).optional() }),
  outputSchema: z.object({ rows: z.array(z.record(z.unknown())), rowCount: z.number() }),
  sideEffect: false,
  fixture: () => ({
    rows: [
      { day: "2026-06-10", signups: 42, revenue: 1280 },
      { day: "2026-06-11", signups: 51, revenue: 1525 },
      { day: "2026-06-12", signups: 47, revenue: 1410 },
    ],
    rowCount: 3,
  }),
});

export const postgresExecute = defineAction({
  name: "postgres.execute",
  description:
    "Run a guarded write (INSERT/UPDATE/DELETE). Side-effecting → approval-gated. DDL is rejected.",
  inputSchema: z
    .object({ sql: z.string(), params: z.array(z.unknown()).optional() })
    .refine((v) => !DESTRUCTIVE.test(v.sql), {
      message: "destructive DDL (DROP/TRUNCATE/ALTER) is not allowed",
      path: ["sql"],
    }),
  outputSchema: z.object({ rowCount: z.number() }),
  sideEffect: true,
  fixture: () => ({ rowCount: 1 }),
});

export const postgresConnector: Connector = {
  provider: "postgres",
  authType: "api_key",
  actions: [postgresQuery, postgresExecute],
};
