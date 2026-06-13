# Cogwork — Context File

> **Tagline:** *Describe it. Review it. Let it run.*
> **One-liner:** Open-source, AI-native workflow automation — turn plain-English instructions into reliable, readable, auditable automations that run on a schedule.

This document is the single source of truth for the Cogwork build. It is intentionally exhaustive: product, architecture, data model, APIs, the agent pipeline, the execution engine, connectors, the trust layer, every UI page, what you need to run it, and a phased plan.

---

## 0. Origin, licensing, and the "no brand" rule

Cogwork is an **independent, original product** inspired by the *concept* of a YC W26 company (Bubble Lab) that ships a Slack-native AI ops agent and an open-core, TypeScript-native workflow engine.

- **We clone the idea, not the company.** No lifted names, logos, marketing copy, screenshots, or UI assets. All Cogwork copy, naming ("Cogwork", "Workflow", "Spec", "Connector", "Run"), and branding is original. We do **not** use their product/agent names or their node naming.
- Bubble Lab's *engine* is open-core under **Apache 2.0**. We reference it **only as architectural inspiration** (how to model workflows-as-code). We do not copy their source verbatim. If any Apache-2.0 code is ever reused, it must keep its LICENSE/NOTICE and attribution — but the default is **reimplement, don't copy**.
- **Cogwork's own license:** Apache 2.0 (permissive, patent grant, compatible with reuse). New original code is Apache 2.0 across the repo.
- **Open-source is a hard requirement.** Prefer permissive (MIT/Apache 2.0), self-hostable dependencies. Avoid any closed component baked into the core. External SaaS APIs (LLM provider, Apify) are allowed because they're runtime services with user-supplied keys and are swappable — they do not close the codebase.

---

## 1. What Cogwork is (product)

Cogwork is a web app (a "studio") where a user:

1. **Describes** a workflow in plain English ("Every weekday at 8am, summarize my unread email from the last day and post it to my Slack DMs; draft replies in Gmail for anything that needs one").
2. The **Builder** (an LLM) compiles that into a **Workflow Spec** — a typed, declarative description of the trigger, steps, tools, parameters, and data flow.
3. The user **reviews** the spec rendered as (a) plain-English summary, (b) a visual flow, and (c) optional generated TypeScript. They refine in natural language ("make it skip weekends", "only emails from customers"). Edits become spec diffs.
4. On **approve**, the workflow is saved and (if scheduled) registered with the scheduler.
5. A deterministic **Engine** runs the spec on its trigger, step by step, with **retries**, **idempotency**, **approval gates** on side-effectful actions, **per-run cost/token tracking**, and a complete **run trace**.
6. The user manages **connections** (OAuth to Gmail/Slack/etc.), browses **templates**, reviews **runs**, approves pending **actions**, and edits what the agent **remembers** about them.

**Surfaces:** Web studio first (this build). Later: a Slack bot, an MCP server (so Claude/Cursor can build & run Cogwork workflows), a CLI, and TS export/API.

**Who it's for:** ops, growth, founders, and developers who want repeatable automations across their tool stack without writing or maintaining glue code — but who also want to *read and trust* what runs.

---

## 2. Product principles (the spine)

1. **Draft ≠ Execute.** The LLM drafts/edits a *spec*. A deterministic engine *interprets* the spec. We never re-prompt an LLM on a cron to "do the task" — that produces inconsistent output and silent failures. (v1: we do **not** execute LLM-generated TypeScript; codegen is export-only.)
2. **Readable & auditable.** Every workflow is a human-readable spec + plain-English summary. Every run is a step-by-step trace with inputs/outputs (secrets redacted), errors, retries, tokens, and cost.
3. **Trust-first.** Approval gates, audit logs, idempotency, partial-failure resume, encrypted secrets, scoped OAuth — built from day one, not bolted on.
4. **Open & self-hostable.** Runs locally with `docker-compose` (Postgres) + `pnpm dev`. No closed core dependency. Providers and connectors are swappable.
5. **Web-first.** The studio is the product. Slack/MCP/CLI are additional triggers/clients over the same engine and spec.

---

## 3. Core concepts & glossary

- **Workflow** — a saved, named automation. Has a current **Spec**, a status (`draft|active|paused`), a trigger, and version history.
- **Spec (Workflow Spec / DSL)** — the canonical, JSON-serializable, Zod-validated description of the workflow. The thing that is versioned and executed.
- **Step (Node)** — one unit of work in a spec; references a **tool** with typed `params`. May have `forEach`, `condition`, `approval`, `retry`, and named `outputs`.
- **Connector** — an integration (Gmail, Slack, …). Exposes one or more **Actions** (`gmail.list_messages`). Owns its auth (OAuth2 or API key) and Zod input/output schemas. Marks actions as `sideEffect` (→ approval-gated by default).
- **Tool** — any callable a step can reference: a connector action, the built-in **AI step** (`ai.generate`), or a utility (`http.request`, `code.transform`).
- **Trigger** — what starts a run: `manual`, `webhook`, or `schedule` (cron + timezone). (Event triggers like "new calendar event" are modeled as scheduled polls in v1, native webhooks later.)
- **Run** — one execution of a workflow. Has status, trigger source, timing, cost, and a set of **Run Steps**.
- **Run Step** — the recorded execution of one spec step within a run (status, input, output, error, attempt). Enables observability + resume.
- **Approval** — a pause point created when a side-effectful step needs human confirmation. Resolved (approve/reject) from the Approvals inbox; the run resumes from DB state.
- **Memory / Preferences** — per-user key/value facts ("briefing format", "default Slack channel", "tone") injected into builder prompts and AI steps. "Remember that I…" writes here.
- **Builder** — the LLM pipeline that compiles NL → spec, applies NL edits → spec diffs, generates summaries and TS export.
- **Engine** — the deterministic interpreter that executes a spec.

---

## 4. The Workflow Spec (DSL) — the heart of the system

The spec is a small, typed, declarative DSL. It is **the** artifact that is stored, versioned, diffed, executed, and exported.

### 4.1 TypeScript / Zod shape

```ts
// packages/spec/src/schema.ts
import { z } from "zod";

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("webhook"), path: z.string() }),
  z.object({
    type: z.literal("schedule"),
    cron: z.string(),                 // standard 5-field cron
    timezone: z.string().default("UTC"),
  }),
]);

export const StepSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),      // unique within the workflow
  tool: z.string(),                          // e.g. "gmail.list_messages"
  params: z.record(z.unknown()).default({}), // values may contain {{ bindings }}
  forEach: z.string().optional(),            // binding to an array → run per item; exposes {{ item }}, {{ index }}
  condition: z.string().optional(),          // {{ binding }} truthy → run, else skip
  approval: z.enum(["required", "auto"]).optional(), // gate; default derived from tool.sideEffect
  retry: z.object({ max: z.number().int().min(0).max(10), backoffMs: z.number().int() }).optional(),
  outputs: z.array(z.string()).optional(),   // names the step exposes downstream
});

export const WorkflowSpecSchema = z.object({
  version: z.number().int(),
  name: z.string(),
  description: z.string().optional(),
  trigger: TriggerSchema,
  steps: z.array(StepSchema).min(1),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type Step = z.infer<typeof StepSchema>;
```

### 4.2 Bindings (data flow)

Values in `params`, `condition`, and `forEach` may contain mustache-style bindings, resolved at runtime against the run context:

- `{{ stepId.outputName }}` — output of a prior step.
- `{{ item.field }}` / `{{ index }}` — current item inside a `forEach`.
- `{{ trigger.payload.x }}` — webhook payload / scheduled context.
- `{{ secrets.NAME }}` — resolved server-side from the user's connections; **never logged**.

The resolver is a small, safe interpolator (no `eval`): it walks the context object by path and substitutes. `condition` supports a tiny boolean grammar (`==`, `!=`, presence, length) — not arbitrary JS.

### 4.3 Example spec (the "morning briefing" hero workflow)

```json
{
  "version": 1,
  "name": "Morning email briefing",
  "description": "Summarize unread email, draft replies, post a brief to Slack.",
  "trigger": { "type": "schedule", "cron": "0 8 * * 1-5", "timezone": "America/Los_Angeles" },
  "steps": [
    {
      "id": "fetch_emails",
      "tool": "gmail.list_messages",
      "params": { "query": "is:unread newer_than:1d", "max": 25 },
      "outputs": ["messages"]
    },
    {
      "id": "brief",
      "tool": "ai.generate",
      "params": {
        "model": "claude",
        "instructions": "Summarize these emails into a 5-bullet brief and, for ones needing a reply, produce {to, subject, body}.",
        "input": "{{ fetch_emails.messages }}"
      },
      "outputs": ["summary", "drafts"]
    },
    {
      "id": "draft_replies",
      "tool": "gmail.create_draft",
      "forEach": "{{ brief.drafts }}",
      "params": { "to": "{{ item.to }}", "subject": "{{ item.subject }}", "body": "{{ item.body }}" },
      "approval": "required"
    },
    {
      "id": "post_brief",
      "tool": "slack.post_message",
      "params": { "channel": "@me", "text": "{{ brief.summary }}" },
      "approval": "auto"
    }
  ]
}
```

### 4.4 Spec validation (critical — this is where vibe-code silently fails)

A spec is **not** considered valid just because it parses. Before a workflow can be saved/run, the Builder output must pass **semantic validation** against the connector registry:

1. **Schema** — passes `WorkflowSpecSchema`.
2. **Tool existence** — every `step.tool` exists in the registry.
3. **Param typing** — each step's `params` validates against that tool's Zod `inputSchema` (bindings are type-checked structurally where possible).
4. **Binding resolvability** — every `{{ stepId.x }}` references a step that appears *earlier* and declares output `x`; `{{ item.* }}` only used inside a `forEach` step.
5. **Approval inference** — any step whose tool is `sideEffect: true` defaults to `approval: "required"` unless explicitly set.

If validation fails, the Builder gets the errors back and retries (self-correct loop). **Without this, the LLM will emit specs that reference nonexistent tools/params or unresolvable bindings — they "look done" and crash or no-op mid-run.**

---

## 5. System architecture

### 5.1 Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  STUDIO (Next.js app + marketing site)                                  │
│  Builder chat · Flow view · Runs · Approvals · Connections · Templates  │
│  · Memory · Settings/API keys                                           │
└───────────────┬───────────────────────────────────┬────────────────────┘
                │ (route handlers / server actions)  │
        ┌───────▼────────┐                   ┌────────▼─────────┐
        │  BUILDER        │  NL → Spec        │  ENGINE          │  interprets spec
        │  (LLM pipeline) │  edits → diff     │  (deterministic) │  steps, bindings,
        │  + codegen      │  summaries        │                  │  retries, approvals
        └───────┬─────────┘                   └───────┬──────────┘
                │ validates against                    │ calls
        ┌───────▼─────────────────────────────────────▼──────────┐
        │  CONNECTOR REGISTRY + SDK                                │
        │  gmail · gcal · slack · notion · github · postgres ·     │
        │  apify · http · ai (built-in)                           │
        │  (typed actions, OAuth2 / API-key, encrypted vault)     │
        └───────┬─────────────────────────────────────┬──────────┘
                │                                       │
        ┌───────▼────────┐                     ┌────────▼─────────┐
        │  SCHEDULER      │  cron / webhook →   │  POSTGRES        │
        │  (pg-boss)      │  enqueue runs       │  workflows, runs,│
        │                 │                     │  steps, conns,   │
        └─────────────────┘                     │  approvals, prefs│
                                                 └──────────────────┘
```

### 5.2 End-to-end flow

1. **Auth** (Auth.js) → user signs in (email or Google).
2. **Connect** → OAuth2 to providers; access/refresh tokens stored **encrypted** in `connections`.
3. **Build** → user prompt → Builder (Claude via Vercel AI SDK) → candidate spec → **semantic validation** (Section 4.4) → self-correct loop → valid spec + plain-English summary + optional TS preview.
4. **Review/Edit** → NL edits become spec diffs (Builder applies a targeted change, re-validates).
5. **Save/Activate** → write `workflows` + `workflow_versions`; if `schedule`, register a pg-boss cron; if `webhook`, expose a route.
6. **Trigger fires** → create a `run` (status `queued`) → enqueue.
7. **Engine** picks it up → executes step-by-step (Section 9): resolve bindings → call connector → persist `run_steps` → on an approval-required step, create an `approval`, set run `awaiting_approval`, persist, and **pause**.
8. **Approve** → user resolves in Approvals inbox → run **resumes from DB state** at the next step.
9. **Observe** → run trace, tokens, cost, errors visible in Run detail; failures notify the user with a "fix it" link back into the Builder for that workflow.
10. **Evals** → golden cases run in CI on any Builder-prompt change.

---

## 6. Tech stack (with rationale + OSS flags)

| Concern | Choice | Why / OSS note |
|---|---|---|
| App + API | **Next.js (App Router) + TypeScript** | One codebase for studio UI + API route handlers. |
| UI | **Tailwind + shadcn/ui** | Fast, ownable components; matches a modern dev-tool look without copying anyone's UI. |
| Data | **React Query** | Server-state on the client. |
| DB | **Postgres + Drizzle ORM** | TS-native, lightweight, migrations in-repo. `pgvector` reserved for memory scaling. (Prisma is an acceptable alt.) |
| Jobs/scheduler | **pg-boss** (MIT, Postgres-backed) | Cron + retries + queue with **no extra service** and a clean OSS license. Chosen over Inngest (license/self-host uncertainty) and Temporal (heavy). Temporal = graduate-at-scale option. |
| LLM | **Anthropic (Claude)** via **Vercel AI SDK** (MIT) | Provider-swappable (OpenAI/OpenRouter/local) → keeps core open. |
| Auth | **Auth.js / NextAuth** (OSS) | Email + Google sign-in. Chosen over Clerk to avoid a closed dependency. |
| Connectors/OAuth | **In-house connector SDK** + AES-256-GCM token vault | Composio/Nango have murky self-host/license stories; the hard OSS requirement favors a small in-house layer. More work, cleaner result. |
| Scraping | **Apify** (API + user key) | Per project choice. Runtime SaaS, swappable for self-hosted Playwright/Firecrawl-OSS later; does not close the codebase. |
| Validation | **Zod** | Spec schema, connector I/O, API payloads. |
| Slack (later) | **Slack Bolt + Socket Mode** | Bot surface over the same engine. |
| MCP (later) | **MCP server** | Exposes build/run tools to Claude/Cursor. |
| Deploy | **Vercel** (hosted) **+ Docker Compose** (self-host) | Self-host is first-class given the OSS requirement. |

---

## 7. Data model (Postgres / Drizzle)

```
users
  id (uuid, pk) · email (unique) · name · image · created_at

connections                         -- OAuth / API-key per provider per user
  id (uuid, pk) · user_id (fk) · provider (text)  -- 'google' | 'slack' | 'notion' | 'github' | 'apify' ...
  label (text)                                    -- supports multiple creds per provider
  auth_type (text)                                -- 'oauth2' | 'api_key'
  access_token_enc (bytea) · refresh_token_enc (bytea)
  scopes (text[]) · expires_at (timestamptz) · metadata (jsonb)
  created_at · updated_at

workflows
  id (uuid, pk) · user_id (fk) · name · description
  spec (jsonb)                       -- current WorkflowSpec
  compiled_code (text)               -- export-only TS (nullable)
  status (text)                      -- 'draft' | 'active' | 'paused'
  trigger_type (text)                -- 'manual' | 'webhook' | 'schedule'
  schedule_cron (text) · timezone (text) · webhook_path (text)
  version (int) · created_at · updated_at

workflow_versions                    -- history / rollback
  id (uuid, pk) · workflow_id (fk) · version (int)
  spec (jsonb) · compiled_code (text) · created_at · note (text)

runs
  id (uuid, pk) · workflow_id (fk) · workflow_version (int)
  status (text)                      -- 'queued'|'running'|'awaiting_approval'|'succeeded'|'failed'|'cancelled'
  trigger_source (text)              -- 'manual'|'schedule'|'webhook'|'api'
  started_at · finished_at · duration_ms (int)
  token_input (int) · token_output (int) · cost_usd (numeric)
  error (text) · created_at

run_steps                            -- per-step trace + resume checkpoint
  id (uuid, pk) · run_id (fk) · step_id (text) · item_index (int)  -- forEach
  tool (text) · status (text)        -- 'pending'|'running'|'succeeded'|'failed'|'skipped'
  input (jsonb) · output (jsonb)     -- secrets redacted before persist
  error (text) · attempt (int)
  idempotency_key (text)             -- (run_id, step_id, item_index) hash
  started_at · finished_at

approvals
  id (uuid, pk) · run_id (fk) · step_id (text) · item_index (int)
  status (text)                      -- 'pending'|'approved'|'rejected'
  preview (jsonb)                    -- redacted summary of the side-effect to confirm
  requested_at · resolved_at · resolved_by (fk users)

preferences                          -- memory
  id (uuid, pk) · user_id (fk) · key (text) · value (jsonb) · updated_at
  unique(user_id, key)

audit_log
  id (uuid, pk) · user_id (fk) · action (text) · entity (text) · entity_id (uuid)
  metadata (jsonb) · created_at

api_keys                             -- platform API / MCP keys (later)
  id (uuid, pk) · user_id (fk) · key_hash (text) · scopes (text[])  -- 'read'|'write'|'execute'
  label (text) · last_used_at · created_at
```

---

## 8. API surface (Next.js route handlers)

All under `/api`. Auth via session (Auth.js) or `Authorization: Bearer cw_...` (API keys, later).

```
# Auth (handled by Auth.js)
GET/POST /api/auth/[...nextauth]

# Connections (OAuth + management)
GET    /api/connections                      list user connections
GET    /api/connections/:provider/start      begin OAuth2 (redirect)
GET    /api/connections/:provider/callback   OAuth2 callback → store encrypted tokens
DELETE /api/connections/:id                   disconnect
POST   /api/connections/api-key               add an api-key connection (e.g. Apify)

# Builder
POST   /api/builder/compile                   { prompt } -> { spec, summary, codePreview, valid, errors? }
POST   /api/builder/edit                       { workflowId|spec, instruction } -> { spec, diff, summary, valid }
POST   /api/builder/explain                    { spec } -> { summary }

# Workflows
GET    /api/workflows                          list
POST   /api/workflows                          create (save spec) -> registers schedule/webhook
GET    /api/workflows/:id                       detail (+ versions)
PATCH  /api/workflows/:id                       update (name/spec/status) -> re-register triggers
DELETE /api/workflows/:id
POST   /api/workflows/:id/activate              status -> active
POST   /api/workflows/:id/pause                 status -> paused
POST   /api/workflows/:id/run                   manual run -> { runId }
GET    /api/workflows/:id/export                export TS (download)

# Runs
GET    /api/workflows/:id/runs                  list runs
GET    /api/runs/:runId                          run detail (+ steps)
POST   /api/runs/:runId/cancel
POST   /api/runs/:runId/retry                    retry failed run from last good step

# Approvals
GET    /api/approvals                            pending approvals for user
POST   /api/approvals/:id/approve                -> resume run
POST   /api/approvals/:id/reject                 -> fail/skip step per policy

# Webhooks (workflow triggers)
POST   /api/hooks/:webhookPath                   external trigger -> enqueue run

# Memory
GET    /api/preferences
PUT    /api/preferences/:key
DELETE /api/preferences/:key

# Templates
GET    /api/templates                            list prebuilt specs
POST   /api/templates/:id/clone                  -> new draft workflow

# Connectors (metadata for UI)
GET    /api/connectors                           registry: providers, actions, schemas, sideEffect flags
```

---

## 9. The Builder pipeline (agentic drafting)

**Goal:** NL → valid spec, NL edits → spec diff, plus summaries and TS export.

**Model:** Claude via Vercel AI SDK. Provider-swappable. Two roles:
- **Compile** (NL → spec): the heavier reasoning step.
- **Apply/Edit** (instruction → targeted spec change): can use the same or a cheaper/faster model.

**Prompt structure (compile):**
- System: Cogwork's spec DSL definition (Section 4), the **connector catalog** (each tool's name, description, input schema, `sideEffect`), binding rules, and hard constraints ("only use listed tools/params", "all bindings must reference earlier outputs").
- Context: the user's relevant **preferences/memory** (briefing format, default channel, tone).
- User: the natural-language request.
- Output contract: **spec JSON only** (validated against `WorkflowSpecSchema`).

**Self-correct loop:** compile → `WorkflowSpecSchema.parse` → semantic validation (Section 4.4) → if errors, feed them back (max N retries) → return spec + plain-English summary.

**Edit/diff:** given current spec + instruction, the Builder returns a **new spec** (or a JSON-patch); re-validate; show the diff. Editing the spec is always re-validated — NL edits cannot produce an invalid stored spec.

**Codegen (export-only):** deterministic template that maps the spec to a readable TS `Workflow` class (one method per step, typed connector calls). **Not executed at runtime.** It exists for portability, audit, and the "own your workflow as code" story.

### 9.1 Concrete compile implementation (v1 — must be real, not a stub)

Workflow generation is a **required, working v1 feature**, not a placeholder. Three mechanisms together guarantee the output is a real, runnable workflow and not hallucinated JSON:

1. **Structured output** — the model is forced to return JSON that satisfies `WorkflowSpecSchema` (no free-text, no markdown).
2. **Catalog injection** — the system prompt lists the *live* connector registry, so the model can only reference tools/params that actually exist.
3. **Validate-and-repair loop** — semantic validation (Section 4.4) runs on the output; any errors are fed back and the model retries until valid or the repair budget is exhausted.

```ts
// packages/builder/src/compile.ts
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { WorkflowSpecSchema, type WorkflowSpec } from "@cogwork/spec";
import { validateSpec } from "@cogwork/spec/validate";   // semantic validation (Section 4.4)
import { getToolCatalog } from "@cogwork/connectors";      // serialized live registry
import { loadPreferences } from "@cogwork/db";
import { explainSpec } from "./explain";                   // spec -> plain-English summary

export interface CompileResult {
  spec: WorkflowSpec | null;
  summary: string;
  valid: boolean;
  errors: string[];
  usage?: { input: number; output: number };
}

export async function compileWorkflow(opts: {
  prompt: string;
  userId: string;
  maxRepairs?: number;
}): Promise<CompileResult> {
  const catalog = getToolCatalog();           // [{ name, description, inputSchema, sideEffect }]
  const prefs = await loadPreferences(opts.userId);
  const system = buildSystemPrompt(catalog, prefs);

  let messages = [{ role: "user" as const, content: opts.prompt }];
  const maxRepairs = opts.maxRepairs ?? 3;

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    // 1) Force a schema-valid spec (parseable JSON guaranteed by the schema)
    const { object: spec, usage } = await generateObject({
      model: anthropic("claude"),             // provider-swappable
      schema: WorkflowSpecSchema,
      system,
      messages,
    });

    // 2) Semantic validation: tools exist, params type-check, every binding resolves
    const result = validateSpec(spec, catalog);
    if (result.ok) {
      const summary = await explainSpec(spec);
      return { spec, summary, valid: true, errors: [],
               usage: { input: usage.promptTokens, output: usage.completionTokens } };
    }

    // 3) Self-correct: hand the exact errors back and retry
    messages = [
      ...messages,
      { role: "assistant" as const, content: JSON.stringify(spec) },
      { role: "user" as const, content:
        "That spec is invalid. Fix ONLY these problems and return the full corrected spec:\n" +
        result.errors.map((e) => `- ${e}`).join("\n") },
    ];
  }
  return { spec: null, summary: "", valid: false,
           errors: ["Could not produce a valid spec within the repair budget."] };
}

function buildSystemPrompt(catalog: ToolMeta[], prefs: Pref[]): string {
  return [
    DSL_REFERENCE,                            // the spec shape + binding syntax (Section 4)
    "You may ONLY use the tools below. Never invent tools, actions, or params:",
    catalog.map((t) =>
      `- ${t.name} (sideEffect:${t.sideEffect}) — ${t.description}\n  input: ${JSON.stringify(t.inputSchema)}`
    ).join("\n"),
    "Binding rules: every {{ stepId.output }} must reference an EARLIER step's declared output; " +
    "use {{ item.* }} only inside a step that has forEach; mark every side-effect step approval:required.",
    prefs.length
      ? "User preferences to honor:\n" + prefs.map((p) => `- ${p.key}: ${JSON.stringify(p.value)}`).join("\n")
      : "",
  ].filter(Boolean).join("\n\n");
}
```

**Fallback if `generateObject` struggles with the schema.** The spec uses a discriminated union (`trigger`) and `z.record(z.unknown())` (`params`); some model/schema-conversion combinations handle this imperfectly. If so, switch to `generateText` with an explicit "return spec JSON only" instruction and `WorkflowSpecSchema.safeParse(JSON.parse(text))`, keeping the same repair loop. Either path must end in a **schema-valid + semantically-valid** spec — never a stub or a "TODO".

### 9.2 Definition of done for generation (acceptance test)

Generation is "done" only when this passes — a golden case that compiles a prompt into a **runnable** spec built from real tools:

```ts
// packages/evals/cases/morning-briefing.test.ts
test("generates a runnable morning-briefing workflow from a prompt", async () => {
  const { spec, valid } = await compileWorkflow({
    prompt:
      "Every weekday at 8am, summarize my unread Gmail from the last day and DM me the summary on Slack.",
    userId: TEST_USER,
  });

  expect(valid).toBe(true);
  expect(spec!.trigger).toMatchObject({ type: "schedule", cron: "0 8 * * 1-5" });

  const tools = spec!.steps.map((s) => s.tool);
  expect(tools).toEqual(
    expect.arrayContaining(["gmail.list_messages", "ai.generate", "slack.post_message"]),
  );

  // tools all exist + every binding resolves (validateSpec is the gate, not vibes)
  expect(validateSpec(spec!, getToolCatalog()).ok).toBe(true);
});
```

And a **manual end-to-end check** that ships in Day 1: from the Builder UI, type the prompt above, see the generated summary + flow, save it, **run it manually** against connected Gmail/Calendar/Slack, approve the gated draft step, and confirm a real run trace with step inputs/outputs appears. If the workflow is hardcoded rather than generated from the prompt, Day 1 is **not** done.

---

## 10. The Execution Engine (deterministic)

A plain interpreter over the spec. No `eval`, no executing generated code.

**Loop (per run):**

```
ctx = loadContext(run)        // from run_steps already completed (resume-safe)
for step in spec.steps (in declared order):
  if run_steps has succeeded(step): continue          // resume / idempotency
  if step.condition and not truthy(resolve(step.condition, ctx)): mark skipped; continue

  items = step.forEach ? resolve(step.forEach, ctx) : [SINGLE]
  for (item, index) in items:
    if needsApproval(step) and not approved(run, step, index):
       upsert approval(run, step, index, preview=redact(resolve(step.params)))
       set run.status = 'awaiting_approval'; persist; RETURN     // pause here
    input = resolve(step.params, ctx, item, index)
    key   = idempotencyKey(run.id, step.id, index)
    for attempt in 1..(step.retry?.max ?? defaultMax):
      try:
        output = connector(step.tool).run(input, connCtx, key)
        persist run_step(success, redact(input), redact(output), attempt)
        break
      catch e:
        persist run_step(failed attempt, error=e, attempt)
        if attempt < max: sleep(backoff(attempt)); continue
        else: set run.status='failed'; notifyUser(fixLink); RETURN
    ctx[step.id] = output  // (forEach aggregates into an array)

set run.status='succeeded'; finalize cost/tokens
```

**Reliability properties (the hard part — Section 12 elaborates):**
- **Idempotency:** every side-effecting step carries a key `(run_id, step_id, item_index)`. Connectors that support provider idempotency keys pass them through; others guard by checking `run_steps` for a prior success before re-executing on resume.
- **Partial-failure resume:** state lives in `run_steps`, not memory. `retry` re-enters the loop and skips already-succeeded steps → no double-sends.
- **Approval pause/resume:** pausing persists run state and returns; approving re-enqueues the run, which resumes at the pending step from DB.
- **Secret redaction:** inputs/outputs are redacted (token/email/PII patterns + known secret fields) **before** persisting to `run_steps`/`approvals`.
- **Cost/tokens:** AI steps record usage onto the run.

---

## 11. Connectors & integrations

### 11.1 Connector SDK (the interface)

```ts
// packages/connectors/core/types.ts
export interface ConnectorAction<I, O> {
  name: string;                       // "gmail.list_messages"
  description: string;                // used in the Builder catalog
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  sideEffect: boolean;                // true → approval-gated by default
  run(input: I, ctx: ConnectorContext, idempotencyKey?: string): Promise<O>;
}

export interface Connector {
  provider: string;                   // "google" | "slack" | ...
  authType: "oauth2" | "api_key";
  oauth?: {
    authorizeUrl: string; tokenUrl: string; scopes: string[];
    refresh(refreshToken: string): Promise<TokenSet>;
  };
  actions: ConnectorAction<any, any>[];
}

export interface ConnectorContext {
  connection: DecryptedConnection;    // tokens decrypted just-in-time
  logger: StepLogger;
  fetch: typeof fetch;
}
```

Connectors register into a **registry** that the Builder reads (to know available tools) and the Engine reads (to execute). Adding an integration = implement `Connector` + its actions' Zod schemas.

### 11.2 v1 connector set

| Connector | Auth | Representative actions (`sideEffect`) |
|---|---|---|
| **AI step** (`ai`) | platform/user key | `ai.generate` (summarize/draft/classify/extract) |
| **HTTP** (`http`) | none/api_key | `http.request` (call any REST API) |
| **Gmail** | Google OAuth2 | `gmail.list_messages`, `gmail.get_message`, `gmail.create_draft`✅, `gmail.send`✅ |
| **Google Calendar** | Google OAuth2 | `gcal.list_events`, `gcal.create_event`✅ |
| **Slack** | Slack OAuth2 | `slack.post_message`✅, `slack.list_channels`, `slack.get_thread` |
| **Notion** | Notion OAuth2 | `notion.query_database`, `notion.create_page`✅, `notion.update_page`✅ |
| **GitHub** | GitHub OAuth2 | `github.list_issues`, `github.create_issue`✅, `github.comment`✅ |
| **Postgres** | connection string (api_key style) | `postgres.query` (read), `postgres.execute`✅ (guarded/validated) |
| **Apify** | API key | `apify.run_actor` (web scraping/search) |

✅ = `sideEffect: true` → approval-gated by default.

This set covers Bubble Lab's headline use cases (briefings, meeting action items, candidate sourcing via Apify/People-search, lead pipeline) without their brand. More connectors (CRM, finance, support, more model providers) are later phases.

### 11.3 OAuth handling

- One OAuth2 helper drives all providers: `/start` builds the consent URL with minimal scopes; `/callback` exchanges the code, **encrypts** tokens (AES-256-GCM with `ENCRYPTION_KEY`), stores `expires_at` + `scopes`.
- **Refresh** is automatic: before a connector call, if `expires_at` is near, refresh and re-store. On refresh failure → mark connection `needs_reauth` and surface a re-connect prompt; runs depending on it fail gracefully with a clear message.

### 11.4 Run modes: `fixture` vs `live` (build credential-free, go live last)

Every connector action supports two run modes, selected by `COGWORK_CONNECTORS=fixture|live` (default `fixture`):

- **`fixture`** — `run()` returns canned, realistic data that **conforms to the action's `outputSchema`** (same validation as live). No network, no credentials. This lets the **entire app run end-to-end** — generation, engine, scheduling, approvals, run traces, every page — with **zero third-party credentials**. It also powers deterministic tests/CI.
- **`live`** — `run()` performs the real API call using the decrypted connection. Requires the OAuth app / API key for that provider.

Fixtures live next to each action (`fixtures/gmail.list_messages.json`, etc.) and double as test inputs. The **only external dependency that is always live is the LLM** (Anthropic), because generation can't be meaningfully exercised against a mock — and you already have that key.

**Consequence for the build:** Phases 0–2 run entirely in `fixture` mode (real generation via Anthropic + fixture connectors). Flipping to `live` — creating OAuth apps, connecting accounts, and shaking out real-API behavior — is the final phase. See §20 and §21.C.

---

## 12. The Trust Layer (the 95% — call it out, build it first)

This is what makes Cogwork sellable and is exactly what naive builds fumble.

1. **Eval harness (day one).** `packages/evals` holds **golden cases**: `{ prompt, expectedSpecShape }`. A runner compiles each prompt with the current Builder prompt and asserts structural expectations (tools used, trigger type, approval flags, binding integrity) — **snapshot tests on compiled specs**. Runs in CI on every Builder-prompt change. This is the single highest-leverage investment; it prevents prompt edits from silently regressing.
2. **Approval gates.** Side-effectful steps (`sideEffect: true`) default to `approval: "required"`. The engine pauses, stores a **redacted preview** of the exact action, and only proceeds on explicit approval. Users can set a step to `auto` per workflow (whitelist).
3. **Audit logging.** `audit_log` records workflow create/edit/activate, connection add/remove, run trigger, approvals (who/when), and failures. Immutable.
4. **Idempotency & partial-failure resume.** As in Section 10 — checkpointed `run_steps` + idempotency keys → safe retries, no double-sends, resumable across restarts.
5. **Secret handling.** Envelope encryption for tokens; redaction before any persistence or display; secrets never enter the LLM context except as opaque `{{ secrets.* }}` resolved server-side.
6. **Permission/identity (v1 scope).** Workflows are single-owner; they execute using **the owner's** connected accounts. Multi-tenant team permissions and "whose Gmail does a shared workflow use?" are explicitly **later**.

---

## 13. Memory / preferences

- `preferences(user_id, key, value)` holds durable facts: `briefing_format`, `default_slack_channel`, `tone`, `timezone`, stakeholder→channel maps, etc.
- **Read:** loaded into the Builder's context at compile/edit time (so generated specs match the user's conventions) and available to `ai.generate` steps.
- **Write:** explicit "remember that I…" in the Builder writes a preference; settings UI exposes a Memory editor to view/edit/delete.
- v1 loads all of a user's preferences (small). pgvector-based relevance retrieval is reserved for when memory grows large.

---

## 14. UI / pages (a real working product, not a demo)

### 14.1 Marketing site (public)
- **Home** — hero ("Describe it. Review it. Let it run."), how-it-works (describe → review → run), live example workflow, integrations strip, social-proof placeholder, primary CTA "Start free".
- **Pricing** — tiers (Section 16).
- **Integrations** — directory of connectors (from `/api/connectors`).
- **Templates** — gallery of prebuilt workflows.
- **Docs** — getting started + concept docs (can start as MD pages).
- **Login / Sign up**.
- **Legal** — Terms, Privacy (original copy).

### 14.2 App / Studio (authenticated)
- **Dashboard** — your workflows (status, last run), recent runs, quick stats (runs, success rate, spend), "New workflow" CTA.
- **Builder** — three-pane: chat (describe/refine) · visual flow (steps + data flow) · spec/TS view (toggle). Validate state visible; "Save & Activate" with schedule/trigger config.
- **Workflow detail** — overview (summary, trigger, schedule), Runs tab (history), Versions tab (diff/rollback), Settings (rename, pause, delete, approval whitelist, export TS).
- **Run detail** — step-by-step trace: each step's status, redacted input/output, errors, attempts, duration, tokens/cost. Retry-from-failure. Timeline view.
- **Approvals** — inbox of pending side-effects with the exact action preview; Approve / Reject; jumps back to the paused run.
- **Connections** — connect/disconnect providers (OAuth), add API-key connections (Apify, Postgres), see scopes + `needs_reauth` state, multiple credentials per provider.
- **Templates** — clone a prebuilt workflow into a draft.
- **Memory** — view/edit/delete remembered preferences.
- **Settings** — profile, API/MCP keys (later), billing placeholder, theme.

### 14.3 Starter templates (ship 4–5; original copy, mirrors Bubble Lab's categories)
1. **Daily briefing** — schedule → fetch email/calendar → AI summary → post to Slack (the hero).
2. **Meeting action items** — fetch a meeting note/transcript (Notion/Google Doc) → AI extract to-dos → post to Slack with mentions + draft follow-up emails (gated).
3. **Candidate / lead sourcing** — Apify search/scrape → AI filter/enrich → append to a Notion DB or Google Sheet.
4. **Issue intake** — webhook/Slack message → AI triage → create GitHub/Notion item (gated).
5. **Weekly report** — schedule → query Postgres → AI summarize → post/email (gated).

---

## 15. Security & secrets

- **Encryption:** AES-256-GCM for all stored OAuth tokens / connection secrets, keyed by `ENCRYPTION_KEY` (32-byte, base64). Decrypt just-in-time per connector call.
- **OAuth scopes:** request the minimum per connector; surface scopes in the Connections UI.
- **Redaction:** centralized redactor strips tokens/PII/known-secret fields from anything written to `run_steps`, `approvals`, logs, or shown in UI.
- **No secrets to the LLM:** the Builder sees the connector *catalog* and the user's preferences, never raw credentials; runtime secrets are `{{ secrets.* }}` resolved server-side only.
- **Webhook auth:** webhook trigger paths are unguessable; optional shared-secret header check.
- **Self-host posture:** all secrets via env; nothing hardcoded; `.env.example` documents every key.

---

## 16. Pricing model (our own; the product can run fully self-hosted for free)

| Tier | Price | Executions / mo | Active workflows | Tool credits | Notes |
|---|---|---|---|---|---|
| **Self-host** | Free forever | unlimited (your infra) | unlimited | n/a | bring your own keys |
| **Free (hosted)** | $0 | ~100 | 2 | small included | get started |
| **Pro** | ~$29/mo | ~1,000 | 10 | included pool | individuals/small teams |
| **Team** | ~$99/mo | ~10,000 | 25 | larger pool | shared workspace |
| **Enterprise** | custom | custom | custom | custom | SSO, on-prem, SLAs |

Three metered axes: **executions**, **active-workflow count**, **tool credits** (pass-through wallet for LLM tokens + Apify, etc.). Numbers are placeholders to finalize.

---

## 17. Repo structure (pnpm + Turborepo monorepo)

```
cogwork/
  apps/
    web/                      # Next.js: marketing + studio + API route handlers
  packages/
    spec/                     # WorkflowSpec Zod schema, types, binding resolver, validator
    engine/                   # deterministic executor (interprets spec)
    connectors/               # connector SDK + built-ins
      core/                   #   interface, registry, OAuth2 helper, token crypto
      gmail/ gcal/ slack/ notion/ github/ postgres/ apify/ http/ ai/
    builder/                  # NL→spec compile, edit→diff, codegen (TS export), prompts
    db/                       # Drizzle schema, migrations, client
    evals/                    # golden cases + runner (CI)
  docker-compose.yml          # Postgres (+ optional pgvector)
  .env.example
  turbo.json
  package.json
  README.md
  COGWORK_CONTEXT.md          # this file
```

(Connectors are subfolders of one package, not separate packages, to keep the build light for fast iteration.)

---

## 18. What you need

### 18.1 To run Cogwork (developer)
- **Node 20+**, **pnpm**, **Docker** (for Postgres) — or any Postgres 15+.
- Env (`.env.example`):

```
# Core
DATABASE_URL=postgres://cogwork:cogwork@localhost:5432/cogwork
ENCRYPTION_KEY=               # 32-byte base64 (openssl rand -base64 32)
AUTH_SECRET=                  # Auth.js (openssl rand -base64 32)
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# LLM (Builder + AI steps)
ANTHROPIC_API_KEY=
# optional swaps
OPENAI_API_KEY=
OPENROUTER_API_KEY=

# OAuth apps (create in each provider's console; set redirect to APP_URL/api/connections/<provider>/callback)
GOOGLE_CLIENT_ID=             # Gmail + Calendar (+ login)
GOOGLE_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Tools
APIFY_TOKEN=
```

### 18.2 To use Cogwork (end user)
1. Sign up (email or Google).
2. **Connect** the accounts you'll automate (Google, Slack, Notion, GitHub) and add API-key connections (Apify, Postgres) as needed.
3. Open the **Builder**, describe a workflow, review the summary/flow, refine in plain English, **approve**.
4. Set a **trigger** (manual / schedule / webhook). Run it. Approve any gated actions. Watch the run trace.

---

## 19. Local setup

```bash
# 1. clone + install
pnpm install

# 2. start Postgres
docker compose up -d

# 3. configure
cp .env.example .env   # fill in keys

# 4. migrate
pnpm db:push           # or db:migrate

# 5. run
pnpm dev               # http://localhost:3000
```

---

## 20. Phased build plan (rebucketed: everything functional in 0–2, dump the hard/extra into 3)

> **Two senses of "done."** *Code-complete* = Claude Code writes it for real, no stub. *Hardened* = it survives real-world API edge cases. Phases 0–2 make **almost the entire product code-complete** and run **entirely in connector `fixture` mode** (§11.4) — so the whole thing works end-to-end with **no credentials except your Anthropic key**. Phase 3 is the dumping ground for the genuinely-hard subsystems, the "extra," and the flip to **`live`** connectors. The only unavoidable manual work is at that final phase (creating OAuth apps — Claude Code can't do that for you).
>
> **Build discipline (every phase):** work in **many small commits**, each one green — typecheck + lint + relevant tests + build must pass **before** the next unit starts, and CI runs on every push. This keeps regressions out continuously instead of surfacing a pile of bugs at the end. Full workflow in §23.

**Phase 0 — Day 1: prove the core loop (hero slice)**
- Next.js app + Tailwind/shadcn; Auth.js (email/Google); Drizzle schema + migrations; docker-compose Postgres.
- Connector SDK + registry; implement **Gmail**, **Google Calendar**, **Slack**, **AI step**; OAuth2 + encrypted token vault.
- `packages/spec` (schema + binding resolver + **semantic validator**).
- **Real workflow generation (hard requirement, not a stub):** Builder `compile` per §9.1 — a plain-English prompt calls Claude, returns a **schema-valid + semantically-valid** `WorkflowSpec` built only from registered tools, with a self-correct/repair loop and a plain-English summary. Must pass the §9.2 acceptance test.
- Engine: **manual run**, bindings, `run_steps`, one **approval gate**, redaction, run trace.
- Studio pages: **Builder**, **Run detail**, **Connections**, **Dashboard**.
- **End-to-end hero loop = Day-1 definition of done:** generate the **Morning briefing** workflow *from a typed prompt* (NOT a hardcoded template), save it, **run it manually** against **fixture** Gmail/Calendar/Slack (no credentials needed; generation is real via Anthropic), approve the gated draft step, and see a real run trace.

**Phase 1 — make it run on its own (the line between demo and product)**
*All code-complete by Claude Code; this is the autonomy + reliability layer that makes workflows usable by anyone other than you in the moment.*
- **Scheduler:** pg-boss cron so `schedule`-triggered workflows actually fire. *(Without this, generation produces "8am daily" specs that never run.)*
- **Webhook triggers:** `/api/hooks/:path` enqueues runs.
- **OAuth refresh + `needs_reauth`** (pulled forward from the old Phase 3): auto-refresh tokens before calls; flag dead connections. *(Without this, a workflow works for ~1 hour after connecting, then silently breaks.)*
- **Retries with backoff**, **partial-failure resume** (checkpoint `run_steps`, skip completed steps), **durable approval pause/resume** (from DB, survives restarts).
- **Idempotency:** keys per `(run_id, step_id, item_index)`; provider idempotency keys where supported; guard-by-checking-`run_steps` elsewhere (so retries don't double-send).
- **Cost/token tracking** per run; failure → in-app notice + "fix it" link back into the Builder.

**Phase 2 — breadth + the rest of the functional surface (almost everything else)**
*All code-complete, happy-path working. Edge-case bulletproofing of connectors is the only part deferred to Phase 3.*
- **Remaining connectors (fixture-backed):** Notion, GitHub, Postgres, Apify (scraping), HTTP — code + fixtures + tests; unlocks the candidate-sourcing / lead-pipeline / report templates (running on fixtures until the final phase).
- **Memory:** preferences read + write + "remember that I…" + Memory editor UI (so generation is personalized).
- **NL edit → spec diff** (refine a workflow in conversation, re-validated).
- **Templates gallery** (4–5 prebuilt specs) + clone-to-draft.
- **Workflow versions + rollback** (DB + UI).
- **TS export** (read-only download).
- **Audit-log writes + basic UI** (inserts + a table view).
- **Eval harness + seed golden cases** in `packages/evals` (functional safety net; broaden coverage later).
- **Remaining app pages, all functional:** Workflow detail (overview/runs/versions/settings), Approvals inbox, Templates, Memory, Settings (profile + theme).
- **Marketing pages (thin but real):** Home, Pricing, Integrations directory, Login/Signup — wired, not "book a demo." Polish + Docs + Legal = Phase 3.

**Phase 3 — EVERYTHING EXTRA + the genuinely-hard (figure out later)**
*Deliberate dumping ground. None of it blocks the core loop from being real and usable.*
- **Go live (flip `fixture` → `live`):** create the OAuth apps + supply provider keys (§21.C), connect accounts, switch connectors to real API calls, and shake out real-provider behavior. *(First time the app touches real Gmail/Slack/etc.)*
- **Multi-tenant / teams:** workspaces, shared workflows, per-workflow identity ("whose Gmail does a shared workflow use?"). v1 is single-owner.
- **Billing + metering:** payment provider, plan quotas, usage enforcement. v1 enforces no limits.
- **Production durability at scale:** pg-boss → Temporal if/when needed; advanced idempotency for non-idempotent providers; per-provider rate-limit/backoff tuning.
- **Connector edge-case hardening:** pagination, large payloads, partial outages, subtle scope errors — found through real usage.
- **Comprehensive evals:** broad golden-case coverage, CI gating, regression dashboards.
- **Distribution surfaces:** Slack bot (Bolt + Socket Mode), MCP server (build/run tools) + API keys/scopes, CLI (`create-cogwork-app`).
- **Native per-provider event webhooks** (replace schedule-polling).
- **pgvector relevance memory** at scale.
- **Marketing/site polish:** Docs site, Legal copy, SEO, finished design.
- **Permanently deferred (by design):** executing LLM-generated TypeScript at runtime — codegen stays export-only.

---

## 21. Stub ledger — what's real, what stays stubbed, what only YOU can do

### 21.A Code-complete after Phases 0–2 (the working product)
Generation (prompt → validated, runnable spec) + NL editing; the spec schema/resolver/validator; the engine with manual + scheduled + webhook triggers, retries, partial-failure resume, durable approval pause/resume, idempotency, cost tracking; OAuth connect **and refresh** for all providers; the full v1 connector set (Gmail, Calendar, Slack, Notion, GitHub, Postgres, Apify, HTTP, AI step) happy-path; memory; templates; versions/rollback; TS export; audit log; eval harness + seed cases; and every app page wired to real data. This is a genuinely usable single-user product.

### 21.B The ONLY things stubbed/deferred (the most-impossible, pushed to Phase 3)
1. **Multi-tenant team permissions / shared-credential identity** — real design work, not safely vibe-codeable. v1: single-owner; workflows run as their owner's connected accounts.
2. **Billing + quota enforcement** — needs a payment account + business logic. v1: no limits enforced; pricing page is informational.
3. **Production durability at scale (Temporal-grade exactly-once)** — pg-boss is functional for v1; this is a later migration, not a stub you'll hit early.
4. **Connector edge-case bulletproofing + broad eval coverage** — happy path + seed cases work now; the long tail (rate limits, pagination, every prompt shape) is iterative and partly needs real-usage discovery + human-curated cases.
5. **Slack bot / MCP server / CLI** — additional surfaces over the same engine; web-only in v1.
6. **Executing generated TypeScript** — permanently export-only by design (safety + determinism).

### 21.C You must provide this (the unavoidable "step-in" — config, not code)
Claude Code builds the code; it **cannot** create accounts or apps for you. Now split by *when*:

**Available now / used throughout (you already have it):**
- **Anthropic API key** — powers real generation + AI steps from Phase 0 on. The one external dependency that's live the whole time. ✅ you have this.

**Local secrets (trivial one-liners, Phase 0):**
- Generate `ENCRYPTION_KEY` and `AUTH_SECRET` (see §18.1).

**Deferred to the FINAL phase ("go live" — NOT needed for 0–2):**
- **OAuth apps** (client ID + secret) for **Google** (Gmail + Calendar + login), **Slack**, **Notion**, **GitHub** — created in each provider's developer console, redirect URI `APP_URL/api/connections/<provider>/callback`. ~30–60 min total. *Until then those connectors run in `fixture` mode (§11.4), so the app is fully functional without them.*
- **Apify key** (scraping connector) — same: fixture until go-live.
- **Connect accounts:** click through OAuth in the app at go-live.

**Decisions only you can make (whenever):** final name/domain + trademark check, pricing numbers, branding assets, legal copy.

> **Reality check (per the build philosophy):** Phases 0–2 are exercised entirely against fixtures + real Anthropic — fully functional in *logic*, but the app hasn't touched a real third-party API yet. **First contact with real Gmail/Slack/etc. is the final phase, and that's where live-API bugs surface.** "Code-complete" ≠ "battle-tested"; don't let a clean fixture demo convince you the edge cases are handled.

---

## 22. The honest hard parts (where vibe-code will be silently wrong)
1. **Specs that "look" valid but aren't** → enforce **semantic validation** against the connector registry (Section 4.4). Non-negotiable.
2. **Cron + free-running agent = inconsistent output / silent failures** → interpret the spec deterministically; never re-prompt to "do the task" on a schedule.
3. **OAuth token refresh + scope errors** are the real reliability tax → implement refresh + `needs_reauth` prompts; a workflow that worked Monday must not silently break when a token expires.
4. **Partial-failure resume** → checkpoint `run_steps` + idempotency keys, or retries will double-send emails/messages.
5. **Approval pause/resume across restarts** → resume from DB state, not memory.
6. **Executing generated code** → don't (v1). Arbitrary execution + nondeterminism. Export only.
7. **Secret leakage** into logs/run_steps/LLM context → centralized redaction + server-side `{{ secrets.* }}` resolution.

---

## 23. Development workflow — commit early, commit often, stay green

The build runs on a tight commit-and-test loop, not big-bang phases. Goal: catch regressions continuously so bugs never pile up to the end.

### 23.1 Commit cadence
- **One logical unit per commit** — a schema, a resolver, one connector's actions, one route, one page. Not "finish the phase, then commit."
- Expect **many commits per phase** (dozens), each small and self-contained.
- **Conventional Commits:** `feat: / fix: / test: / refactor: / chore: / docs:` with a scope, e.g. `feat(spec): semantic validator`, `test(engine): partial-failure resume`.
- Tag the end of each phase: `v0.0-phase0`, `v0.1-phase1`, ….

### 23.2 The green gate (run before EVERY commit)
A commit only lands if all pass locally:
```
pnpm typecheck      # tsc --noEmit across the monorepo
pnpm lint           # eslint
pnpm test           # unit + integration (fixture mode, mocked LLM)
pnpm build          # next build + package builds
```
Fix before committing. **Never commit red.**

### 23.3 What gets tested (the pyramid)
- **Unit:** spec validator (tool existence, binding resolution, param typing — table-driven), binding resolver, redaction, idempotency-key generation, cron parsing.
- **Connector (fixture):** each action maps its fixture input to a schema-valid typed output.
- **Engine (integration):** run whole specs with fixture connectors — assert `run_steps`, **resume** (inject a failure at step N → resume skips 1..N-1, no re-call), **approval pause/resume**, **idempotency** (retry doesn't double-invoke).
- **Generation:** the §9.2 golden cases, two flavors:
  - **Deterministic CI:** mock the LLM with a canned valid spec → tests the *pipeline* (validation, repair loop, persistence) with zero cost/flakiness.
  - **Live evals:** hit real Anthropic, assert *structural* properties (tools used, trigger type, every binding resolves via `validateSpec`) — tolerant to LLM nondeterminism. Run on builder-prompt changes / nightly, not every commit.

### 23.4 CI (GitHub Actions)
- **On every push / PR:** install → typecheck → lint → unit + integration (fixture, mocked LLM) → build. Branch is mergeable only when green.
- **Separate workflow (manual / nightly):** live evals using the `ANTHROPIC_API_KEY` secret.
- No live third-party creds in CI — fixtures cover everything until go-live.

### 23.5 Honest limit
This discipline kills **regressions and logic bugs** continuously — but it **cannot** catch real-provider-API surprises while connectors are in `fixture` mode. Those only appear at go-live (final phase). "All green" means the logic is sound, not that Gmail will behave; treat the first live runs as their own test pass.

---

*End of Cogwork context file.*
