import type { ToolCatalog } from "@cogwork/spec";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * The Builder's system prompt: the spec DSL definition + the live connector
 * catalog + binding rules + the user's preferences. COGWORK_CONTEXT.md §9.
 */

export const DSL_REFERENCE = `You compile a plain-English request into a Cogwork Workflow Spec — a typed, declarative JSON document. Output the spec ONLY (no prose, no markdown).

A spec has this shape:
{
  "version": 1,
  "name": "<short title>",
  "description": "<one sentence>",
  "trigger": <Trigger>,
  "steps": [ <Step>, ... ]   // at least one
}

Trigger is one of:
  { "type": "manual" }
  { "type": "webhook", "path": "<url-safe-path>" }
  { "type": "schedule", "cron": "<5-field cron>", "timezone": "<IANA tz>" }
  - "every weekday at 8am" => cron "0 8 * * 1-5"
  - "every day at 9am"     => cron "0 9 * * *"
  - "every Monday at 7am"  => cron "0 7 * * 1"

Step:
{
  "id": "<lower_snake_case, unique>",
  "tool": "<tool.name from the catalog>",
  "params": { ... },                 // values may contain {{ bindings }}
  "forEach": "{{ binding.to.array }}",// optional: run once per array item
  "condition": "{{ binding }}",       // optional: run only if truthy
  "approval": "required" | "auto",    // optional; side-effect tools default to required
  "outputs": ["name", ...]            // names this step exposes to later steps
}

Bindings (mustache, resolved at runtime — NOT JavaScript):
  {{ stepId.outputName }}   output of an EARLIER step (it must declare that output)
  {{ item.field }} / {{ index }}   current item — ONLY inside a step that has forEach
  {{ trigger.payload.x }}   webhook/scheduled context
  {{ secrets.NAME }}        server-side secret (never inline real secrets)`;

const RULES = `Hard constraints:
- Use ONLY the tools listed below. Never invent tools, actions, or params.
- Every {{ stepId.output }} must reference an EARLIER step that declares that output.
- Use {{ item.* }} / {{ index }} ONLY inside a step that has forEach.
- Mark every side-effect step approval:"required" (drafts, sends, posts, creates).
- Declare every output a later step reads via the producing step's "outputs".
- Prefer a schedule trigger when the request implies a recurring time.`;

export function describeTool(name: string, sideEffect: boolean, description: string, schema: unknown): string {
  const json = JSON.stringify(zodToJsonSchema(schema as never, { target: "jsonSchema7" }));
  return `- ${name} (sideEffect:${sideEffect}) — ${description}\n  input: ${json}`;
}

export function buildSystemPrompt(
  catalog: ToolCatalog,
  preferences: Record<string, unknown> = {},
): string {
  const tools = catalog
    .map((t) => describeTool(t.name, t.sideEffect, t.description, t.inputSchema))
    .join("\n");

  const prefEntries = Object.entries(preferences);
  const prefs = prefEntries.length
    ? "User preferences to honor:\n" +
      prefEntries.map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join("\n")
    : "";

  return [DSL_REFERENCE, RULES, "Available tools:\n" + tools, prefs]
    .filter(Boolean)
    .join("\n\n");
}
