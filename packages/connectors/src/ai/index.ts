import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { defineAction, type Connector } from "../core/types";
import { resolveAnthropicModel } from "./models";

/**
 * The built-in AI step. In `live` mode it calls Anthropic via the Vercel AI SDK
 * (provider-swappable). In `fixture` mode it returns deterministic, input-aware
 * output so the engine runs end-to-end with no credentials and tests stay
 * deterministic. The Builder's generation (packages/builder) is the always-live
 * Anthropic path; this is the per-run AI step.
 */

const DraftSchema = z.object({ to: z.string(), subject: z.string(), body: z.string() });

const InputSchema = z.object({
  instructions: z.string(),
  input: z.unknown().optional(),
  model: z.string().optional(),
  system: z.string().optional(),
});

const OutputSchema = z
  .object({
    text: z.string(),
    summary: z.string().optional(),
    drafts: z.array(DraftSchema).optional(),
    usage: z.object({ input: z.number(), output: z.number() }).optional(),
  })
  .passthrough();

type Input = z.infer<typeof InputSchema>;

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function fixtureSummary(items: Record<string, unknown>[]): string {
  if (items.length === 0) {
    return "• No items to summarize.\n• (AI step ran in fixture mode.)";
  }
  const bullets = items.slice(0, 5).map((m, i) => {
    const subj = (m.subject as string) ?? (m.title as string) ?? `Item ${i + 1}`;
    const who = (m.from as string) ?? (m.author as string) ?? "";
    return `• ${subj}${who ? ` — from ${who}` : ""}`;
  });
  const extra = items.length > 5 ? `\n• …and ${items.length - 5} more` : "";
  return `${items.length} item(s) summarized:\n${bullets.join("\n")}${extra}`;
}

function fixtureDrafts(items: Record<string, unknown>[]): z.infer<typeof DraftSchema>[] {
  return items.slice(0, 3).map((m) => ({
    to: (m.from as string) ?? "someone@example.com",
    subject: `Re: ${(m.subject as string) ?? "your message"}`,
    body: `Thanks for your message — following up shortly.\n\n(Drafted by Cogwork in fixture mode.)`,
  }));
}

function buildPrompt(input: Input): string {
  const parts = [input.instructions];
  if (input.input !== undefined) {
    parts.push("\n\nInput data:\n" + JSON.stringify(input.input, null, 2));
  }
  return parts.join("");
}

export const aiGenerate = defineAction({
  name: "ai.generate",
  description:
    "Use an LLM to summarize, draft, classify, or extract. Returns { text, summary?, drafts? }.",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  sideEffect: false,
  fixture: (input) => {
    const items = asArray(input.input);
    const summary = fixtureSummary(items);
    return { text: summary, summary, drafts: fixtureDrafts(items) };
  },
  live: async (input) => {
    const model = anthropic(resolveAnthropicModel(input.model));
    const { text, usage } = await generateText({
      model,
      system:
        input.system ??
        "You are a precise assistant. If the task asks for structured output, return ONLY a JSON object.",
      prompt: buildPrompt(input),
    });
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // free-text response
    }
    const summary = typeof parsed.summary === "string" ? parsed.summary : text;
    const drafts = Array.isArray(parsed.drafts)
      ? (parsed.drafts as z.infer<typeof DraftSchema>[])
      : undefined;
    return {
      text,
      summary,
      drafts,
      usage: { input: usage?.promptTokens ?? 0, output: usage?.completionTokens ?? 0 },
    };
  },
});

export const aiConnector: Connector = {
  provider: "ai",
  authType: "api_key",
  actions: [aiGenerate],
};
