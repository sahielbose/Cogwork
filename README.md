<div align="center">

# Cogwork

### Describe it. Review it. Let it run.

**Turn a sentence into a typed, reviewable workflow that runs on schedule, with every step traceable.** Open-source, AI-native workflow automation for people who want repeatable automations across their stack without writing or maintaining the glue code, and who want to read and trust what runs.

<br/>

![License](https://img.shields.io/badge/license-MIT-eab308?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)

![Tests](https://img.shields.io/badge/tests-157%20passing-2ea44f?style=flat-square)
![Fixture mode](https://img.shields.io/badge/fixture%20mode-zero%20third--party%20keys-5b2ee5?style=flat-square)
![Self host](https://img.shields.io/badge/self--hostable-yes-3a3d46?style=flat-square)

<br/>

[Quickstart](#quickstart) &nbsp;&middot;&nbsp; [How it works](#how-it-works) &nbsp;&middot;&nbsp; [The hero loop](#the-hero-loop) &nbsp;&middot;&nbsp; [Architecture](#architecture) &nbsp;&middot;&nbsp; [Go live](#going-live)

</div>

---

> Most automation tools make you wire nodes by hand, then hope the result does what you meant. Cogwork compiles your words into a typed, readable spec, runs it deterministically, and traces every step. The model drafts the spec; a deterministic engine runs it. **Readable, auditable, and trusted by design.**

## What it does

- **Generate from plain English.** Describe a workflow and an LLM compiles it into a typed Workflow Spec. The spec is validated against the live connector registry (tools exist, params type-check, every binding resolves) and repaired until valid before it can be saved or run. Never hardcoded, never hallucinated.
- **Review before it runs.** See the spec as a plain-English summary, an interactive flow graph, and one-click TypeScript. Refine it by chatting; every edit is re-validated, so a bad edit can never become a stored workflow.
- **Run deterministically.** A plain interpreter executes the spec step by step with data bindings, retries and backoff, idempotency, approval gates on side-effecting actions, partial-failure resume, and per-run cost and token tracking.
- **Trust built in.** Side-effects (sending mail, posting, creating records) pause for human approval. Tokens are encrypted at rest, secrets are redacted from logs and never sent to the model, and every run is a complete step trace. The engine never re-prompts a model on a cron to "do the task."
- **Open and self-hostable.** Runs locally with Postgres and pnpm. The only external dependency is your own LLM provider key. Providers and connectors are swappable.

## How it works

1. **Describe.** Write what you want, the way you would tell a teammate.
2. **Review.** Cogwork shows the workflow in plain English and a visual flow. Change anything by chatting.
3. **Run.** Trigger it by hand, on a schedule, or by webhook, and watch every step in a live trace.

## The hero loop

A prompt becomes a real, runnable automation end to end:

```
prompt  ->  compile (LLM + schema + repair loop)
        ->  validate (tools exist, params type-check, bindings resolve)
        ->  run (deterministic engine, fixture connectors)
        ->  approve the gated step
        ->  full run trace with redacted step inputs and outputs
```

The generation pipeline, the semantic validator, and the execution engine are real, not stubs, and are covered by a regression test that drives the whole loop.

## Quickstart

Requires Node 20 or newer, pnpm, and Docker (for Postgres).

```bash
pnpm install

# start Postgres
docker compose up -d

# configure: copy the example, add your LLM key, generate two local secrets
cp .env.example .env
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "AUTH_SECRET=$(openssl rand -base64 32)"    >> .env
# then set ANTHROPIC_API_KEY in .env for real generation

# apply the schema and run
pnpm db:push
pnpm dev          # http://localhost:5050
pnpm worker       # optional: pg-boss scheduler for cron and webhook runs
```

Sign in with any email (a credential-free dev login). Everything works in connector `fixture` mode with no third-party keys. The one live dependency is the LLM provider key, used for generation and AI steps.

> If port 5432 is taken on your machine, set `COGWORK_DB_PORT` for the container and point `DATABASE_URL` at it.

## The green gate

Run before every commit. The build stays green at all times.

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

157 tests across unit, integration, connector-fixture, engine end-to-end, and generation golden cases. Database tests use an embedded Postgres (pglite), so the suite needs no Docker and no credentials.

## Architecture

A pnpm and Turborepo monorepo. The LLM drafts; a deterministic engine runs.

```
apps/
  web/                 Next.js studio + marketing site + API route handlers
packages/
  spec/                Workflow Spec schema, binding resolver, semantic validator
  db/                  Drizzle schema, migrations, typed client and query helpers
  connectors/          connector SDK, registry, token crypto, OAuth helper, built-ins
  engine/              deterministic spec interpreter (runs, steps, approvals, resume)
  builder/             NL to spec compile, edit to diff, explain, TypeScript codegen
  scheduler/           pg-boss cron and webhook worker
  evals/               golden generation cases (mocked in CI, live nightly)
```

## Connectors

Nine connectors, all fixture-backed so the whole product runs with no third-party credentials. Side-effecting actions are approval-gated by default.

| Connector | Auth | Representative actions |
| --- | --- | --- |
| AI step | provider key | `ai.generate` (summarize, draft, classify, extract) |
| HTTP | none or api key | `http.request` |
| Gmail | Google OAuth2 | `list_messages`, `get_message`, `create_draft`, `send` |
| Google Calendar | Google OAuth2 | `list_events`, `create_event` |
| Slack | Slack OAuth2 | `post_message`, `list_channels`, `get_thread` |
| Notion | Notion OAuth2 | `query_database`, `create_page`, `update_page` |
| GitHub | GitHub OAuth2 | `list_issues`, `create_issue`, `comment` |
| Postgres | connection string | `query` (read), `execute` (guarded write) |
| Apify | api key | `run_actor` |

## Trust layer

- **Approval gates.** Side-effecting steps pause and store a redacted preview of the exact action; the run resumes only on explicit approval.
- **Idempotency and resume.** Run state lives in the database, keyed per step and item, so retries never double-send and runs resume from the last good step.
- **Secret handling.** AES-256-GCM at rest, centralized redaction before any persistence or display, and `{{ secrets.* }}` resolved server-side only.
- **Audit log.** Workflow create, edit, activate, run, approval, and rollback are recorded.
- **Evals.** Golden generation cases assert structural properties of compiled specs, so a prompt change cannot silently regress.

## Project status

Phases 0 through 2 are complete and tagged: `v0.0-phase0`, `v0.1-phase1`, `v0.2-phase2`. The product is code-complete and runs entirely in `fixture` mode.

### Going live

Phase 3 is the only remaining work and is configuration, not code. To connect real services:

1. Create OAuth apps for Google, Slack, Notion, and GitHub, plus an Apify key. Set each redirect URI to `APP_URL/api/connections/<provider>/callback`.
2. Add the keys to `.env` and set `COGWORK_CONNECTORS=live`.
3. Connect your accounts in the app and run for real.

Distribution surfaces (Slack bot, MCP server, CLI) and multi-tenant teams are later additions over the same engine.

## Tech stack

Next.js (App Router) and TypeScript, Tailwind and shadcn-style components, React Flow for the canvas, Drizzle and Postgres, pg-boss for scheduling, the Vercel AI SDK with Anthropic (provider-swappable), Zod for validation, and Vitest for tests.

## License

[MIT](./LICENSE), Copyright (c) 2026 Sahiel Bose.
