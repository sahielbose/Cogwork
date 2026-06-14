import { z } from "zod";
import { defineAction, type Connector } from "../core/types";

/** Apify connector (web scraping/search) — fixture-backed (Phase 0–2). API key. */

export const apifyRunActor = defineAction({
  name: "apify.run_actor",
  description: "Run an Apify actor (scraping/search) and return its dataset items.",
  inputSchema: z.object({ actorId: z.string(), input: z.record(z.unknown()).optional() }),
  outputSchema: z.object({
    runId: z.string(),
    items: z.array(z.record(z.unknown())),
  }),
  sideEffect: false,
  fixture: (input) => ({
    runId: `apify_${Buffer.from(input.actorId).toString("hex").slice(0, 8)}`,
    items: [
      { name: "Alex Rivera", title: "Senior Backend Engineer", company: "Northwind", url: "https://example.com/in/alexrivera" },
      { name: "Sam Okafor", title: "Staff Engineer", company: "Helios", url: "https://example.com/in/samokafor" },
      { name: "Jules Tan", title: "Platform Engineer", company: "Pylon", url: "https://example.com/in/julestan" },
    ],
  }),
});

export const apifyConnector: Connector = {
  provider: "apify",
  authType: "api_key",
  actions: [apifyRunActor],
};
