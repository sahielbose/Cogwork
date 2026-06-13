import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { getToolCatalog } from "@cogwork/connectors";
import { loadPreferencesMap, type Db } from "@cogwork/db";
import { validateSpec, WorkflowSpecSchema, type ToolCatalog, type WorkflowSpec } from "@cogwork/spec";
import { explainSpec } from "./explain";
import { buildSystemPrompt } from "./prompts";

/**
 * NL → validated, runnable Workflow Spec (COGWORK_CONTEXT.md §9.1). This is a
 * required, working v1 feature — never a stub. Three mechanisms guarantee real
 * output: (1) structured output forces schema-valid JSON, (2) catalog injection
 * limits the model to tools that exist, (3) a validate-and-repair loop feeds
 * semantic errors back until the spec is valid or the repair budget runs out.
 *
 * The LLM call is injected (`generate`) so CI can run the whole pipeline against
 * a deterministic mock; the default calls Anthropic via the Vercel AI SDK.
 */

export const DEFAULT_COMPILE_MODEL = "claude-sonnet-4-6";

export interface Usage {
  input: number;
  output: number;
}

export interface GenerateArgs {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface GenerateResult {
  spec: unknown;
  usage?: Usage;
}

export type GenerateFn = (args: GenerateArgs) => Promise<GenerateResult>;

export interface CompileResult {
  spec: WorkflowSpec | null;
  summary: string;
  valid: boolean;
  errors: string[];
  usage: Usage;
  attempts: number;
}

export interface CompileOptions {
  prompt: string;
  userId?: string;
  db?: Db;
  catalog?: ToolCatalog;
  preferences?: Record<string, unknown>;
  maxRepairs?: number;
  generate?: GenerateFn;
  model?: string;
}

/** Pull the first JSON object out of a (possibly fenced) text response. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1]! : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found in model output");
  return JSON.parse(body.slice(start, end + 1));
}

/** The real LLM call: generateObject (primary) with a generateText fallback. */
function defaultGenerate(model: string): GenerateFn {
  return async ({ system, messages }) => {
    try {
      const { object, usage } = await generateObject({
        model: anthropic(model),
        schema: WorkflowSpecSchema,
        system,
        messages,
      });
      return {
        spec: object,
        usage: { input: usage?.promptTokens ?? 0, output: usage?.completionTokens ?? 0 },
      };
    } catch {
      // Fallback for schema-conversion edge cases (discriminated union / records).
      const { text, usage } = await generateText({
        model: anthropic(model),
        system: system + "\n\nReturn ONLY the spec as raw JSON. No markdown, no prose.",
        messages,
      });
      return {
        spec: extractJson(text),
        usage: { input: usage?.promptTokens ?? 0, output: usage?.completionTokens ?? 0 },
      };
    }
  };
}

export async function compileWorkflow(opts: CompileOptions): Promise<CompileResult> {
  const catalog = opts.catalog ?? getToolCatalog();
  const preferences =
    opts.preferences ??
    (opts.db && opts.userId ? await loadPreferencesMap(opts.db, opts.userId) : {});
  const system = buildSystemPrompt(catalog, preferences);
  const generate = opts.generate ?? defaultGenerate(opts.model ?? DEFAULT_COMPILE_MODEL);
  const maxRepairs = opts.maxRepairs ?? 3;

  const messages: GenerateArgs["messages"] = [{ role: "user", content: opts.prompt }];
  const usage: Usage = { input: 0, output: 0 };

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const { spec: candidate, usage: u } = await generate({ system, messages });
    if (u) {
      usage.input += u.input;
      usage.output += u.output;
    }

    const result = validateSpec(candidate, catalog);
    if (result.ok) {
      return {
        spec: result.spec!,
        summary: explainSpec(result.spec!),
        valid: true,
        errors: [],
        usage,
        attempts: attempt + 1,
      };
    }

    // self-correct: hand the exact errors back and retry
    messages.push(
      { role: "assistant", content: JSON.stringify(candidate) },
      {
        role: "user",
        content:
          "That spec is invalid. Fix ONLY these problems and return the full corrected spec:\n" +
          result.errors.map((e) => `- ${e}`).join("\n"),
      },
    );
  }

  return {
    spec: null,
    summary: "",
    valid: false,
    errors: ["Could not produce a valid spec within the repair budget."],
    usage,
    attempts: maxRepairs + 1,
  };
}
