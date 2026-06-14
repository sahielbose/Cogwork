import { describe, expect, it } from "vitest";
import {
  createConnectorContext,
  getToolCatalog,
  listActions,
  registerBuiltins,
  requireAction,
  runAction,
} from "./index";

registerBuiltins();

/** A representative, schema-valid input for each registered action. */
const inputs: Record<string, unknown> = {
  "ai.generate": { instructions: "Summarize", input: [{ subject: "Hi", from: "a@b.com" }] },
  "gmail.list_messages": { query: "is:unread newer_than:1d", max: 3 },
  "gmail.get_message": { id: "msg_1001" },
  "gmail.create_draft": { to: "a@b.com", subject: "Re: hi", body: "hello" },
  "gmail.send": { to: "a@b.com", subject: "Re: hi", body: "hello" },
  "gcal.list_events": { max: 2 },
  "gcal.create_event": { summary: "Sync", start: "2026-06-14T10:00:00Z", end: "2026-06-14T10:30:00Z" },
  "slack.post_message": { channel: "@me", text: "Daily brief" },
  "slack.list_channels": {},
  "slack.get_thread": { channel: "C0ENG", ts: "1718200000.000100" },
  "notion.query_database": { databaseId: "db_1" },
  "notion.create_page": { parent: "db_1", title: "New page" },
  "notion.update_page": { pageId: "page_1", properties: { Status: "Done" } },
  "github.list_issues": { repo: "sahielbose/cogwork", state: "open" },
  "github.create_issue": { repo: "sahielbose/cogwork", title: "Bug" },
  "github.comment": { repo: "sahielbose/cogwork", number: 214, body: "On it" },
  "postgres.query": { sql: "select 1" },
  "postgres.execute": { sql: "update users set x=1" },
  "apify.run_actor": { actorId: "apify/web-scraper", input: { query: "engineers" } },
  "http.request": { url: "https://api.example.com/v1/ping", method: "GET" },
};

describe("getToolCatalog", () => {
  it("lists every action with schema + sideEffect flags", () => {
    const catalog = getToolCatalog();
    expect(catalog.length).toBe(listActions().length);
    expect(catalog.length).toBeGreaterThanOrEqual(10);
    for (const tool of catalog) {
      expect(tool.name).toMatch(/^[a-z]+\.[a-z_]+$/);
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.sideEffect).toBe("boolean");
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("marks the right actions as side-effecting", () => {
    const byName = Object.fromEntries(getToolCatalog().map((t) => [t.name, t.sideEffect]));
    expect(byName["gmail.create_draft"]).toBe(true);
    expect(byName["gmail.send"]).toBe(true);
    expect(byName["slack.post_message"]).toBe(true);
    expect(byName["gcal.create_event"]).toBe(true);
    expect(byName["gmail.list_messages"]).toBe(false);
    expect(byName["slack.list_channels"]).toBe(false);
    expect(byName["ai.generate"]).toBe(false);
    expect(byName["notion.create_page"]).toBe(true);
    expect(byName["github.create_issue"]).toBe(true);
    expect(byName["postgres.execute"]).toBe(true);
    expect(byName["postgres.query"]).toBe(false);
    expect(byName["apify.run_actor"]).toBe(false);
    expect(byName["http.request"]).toBe(false);
  });
});

describe("fixture mode — each action conforms to its outputSchema", () => {
  const ctx = createConnectorContext({ runMode: "fixture" });
  for (const action of listActions()) {
    it(`${action.name} returns schema-valid output`, async () => {
      const input = inputs[action.name];
      expect(input, `missing test input for ${action.name}`).toBeDefined();
      // runAction validates input AND output against the action's schemas;
      // a non-conforming fixture would throw here.
      const output = await runAction(action, input, ctx);
      expect(output).toBeTypeOf("object");
    });
  }
});

describe("run-mode switch", () => {
  it("throws in live mode for a fixture-only action (live is Phase 3)", async () => {
    const ctx = createConnectorContext({ runMode: "live" });
    await expect(
      runAction(requireAction("gmail.list_messages"), { query: "x" }, ctx),
    ).rejects.toThrow(/no live implementation/);
  });

  it("side-effect fixture echoes the input (draft)", async () => {
    const ctx = createConnectorContext({ runMode: "fixture" });
    const out = (await runAction(requireAction("gmail.create_draft"), inputs["gmail.create_draft"], ctx)) as {
      to: string;
      subject: string;
    };
    expect(out.to).toBe("a@b.com");
    expect(out.subject).toBe("Re: hi");
  });
});
