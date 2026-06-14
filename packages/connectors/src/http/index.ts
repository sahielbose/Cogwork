import { z } from "zod";
import { defineAction, type Connector } from "../core/types";

/** HTTP connector — call any REST API. Fixture-backed (Phase 0–2). */

export const httpRequest = defineAction({
  name: "http.request",
  description: "Make an HTTP request to any REST API.",
  inputSchema: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
  }),
  outputSchema: z.object({
    status: z.number(),
    body: z.unknown(),
  }),
  sideEffect: false,
  fixture: (input) => ({
    status: 200,
    body: { ok: true, url: input.url, method: input.method ?? "GET", echo: input.body ?? null },
  }),
});

export const httpConnector: Connector = {
  provider: "http",
  authType: "api_key",
  actions: [httpRequest],
};
