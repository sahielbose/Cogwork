import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AI SDK so the live path is deterministic and credential-free.
vi.mock("ai", () => ({ generateText: vi.fn() }));

import { generateText } from "ai";
import { aiGenerate } from "./index";
import { createConnectorContext } from "../core/registry";
import { runAction } from "../core/run-mode";

const mockGenerateText = vi.mocked(generateText);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "test-key";
  mockGenerateText.mockReset();
});

describe("ai.generate — fixture mode", () => {
  it("summarizes input items and drafts replies (deterministic)", async () => {
    const ctx = createConnectorContext({ runMode: "fixture" });
    const out = (await runAction(
      aiGenerate,
      {
        instructions: "Summarize and draft replies",
        input: [
          { subject: "Renewal", from: "priya@acme.com" },
          { subject: "PR review", from: "github@x.com" },
        ],
      },
      ctx,
    )) as { summary?: string; drafts?: { to: string }[] };
    expect(out.summary).toContain("2 item(s) summarized");
    expect(out.drafts).toHaveLength(2);
    expect(out.drafts![0]!.to).toBe("priya@acme.com");
  });
});

describe("ai.generate — live mode (mocked LLM)", () => {
  it("parses a JSON response into summary + drafts and records usage", async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        summary: "Two items need attention.",
        drafts: [{ to: "priya@acme.com", subject: "Re: Renewal", body: "On it." }],
      }),
      usage: { promptTokens: 120, completionTokens: 45, totalTokens: 165 },
      // other AI SDK fields are unused by our action
    } as never);

    const ctx = createConnectorContext({ runMode: "live" });
    const out = (await runAction(
      aiGenerate,
      { instructions: "Summarize", input: [{ subject: "Renewal" }] },
      ctx,
    )) as { summary?: string; drafts?: unknown[]; usage?: { input: number; output: number } };

    expect(mockGenerateText).toHaveBeenCalledOnce();
    expect(out.summary).toBe("Two items need attention.");
    expect(out.drafts).toHaveLength(1);
    expect(out.usage).toEqual({ input: 120, output: 45 });
  });

  it("falls back to free text when the response is not JSON", async () => {
    mockGenerateText.mockResolvedValue({
      text: "Here is a plain-text answer.",
      usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
    } as never);

    const ctx = createConnectorContext({ runMode: "live" });
    const out = (await runAction(aiGenerate, { instructions: "Answer" }, ctx)) as {
      summary?: string;
      text: string;
      drafts?: unknown[];
    };
    expect(out.text).toBe("Here is a plain-text answer.");
    expect(out.summary).toBe("Here is a plain-text answer.");
    expect(out.drafts).toBeUndefined();
  });
});
