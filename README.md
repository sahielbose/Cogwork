# Cogwork

> **Describe it. Review it. Let it run.**
> Open-source, AI-native workflow automation — turn plain-English instructions into reliable, readable, auditable automations that run on a schedule.

Cogwork is a studio where you describe a workflow in plain English; an LLM compiles it into a typed, declarative **Workflow Spec**; you review it as a plain-English summary, a visual flow, and optional TypeScript; and a deterministic **Engine** runs it step-by-step with retries, idempotency, approval gates, and a full run trace.

- **Draft ≠ Execute.** The LLM drafts a *spec*; a deterministic engine *interprets* it. We never re-prompt a model on a cron to "do the task."
- **Readable & auditable.** Every workflow is a human-readable spec; every run is a step trace with redacted inputs/outputs, errors, retries, tokens, and cost.
- **Open & self-hostable.** Apache-2.0. Runs locally with Postgres + `pnpm dev`. Providers and connectors are swappable.

## Status

Built through **Phase 2** (see [`COGWORK_BUILD.md`](./COGWORK_BUILD.md)). The whole product runs in connector **fixture mode** — fully functional end-to-end with **no third-party credentials**. The only live external dependency is the Anthropic API (for real workflow generation + AI steps). Going live with real Gmail/Slack/etc. is Phase 3.

## Quick start

```bash
# 1. install
pnpm install

# 2. start Postgres (Docker)
docker compose up -d

# 3. configure
cp .env.example .env
# generate local secrets:
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "AUTH_SECRET=$(openssl rand -base64 32)"    >> .env
# add your ANTHROPIC_API_KEY to .env for real generation

# 4. migrate
pnpm db:push

# 5. run
pnpm dev   # http://localhost:4000
```

> If port 5432 is taken on your machine, set `COGWORK_DB_PORT` for the container and point `DATABASE_URL` at it (e.g. `:5435`).

## The green gate

Run before every commit; never commit red:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

CI runs the same gate on every push/PR. The workflow definitions are staged in [`ci/`](./ci/) pending a one-time `gh auth refresh -s workflow` (see [`ci/README.md`](./ci/README.md)).

## Monorepo layout

```
apps/web            Next.js: marketing + studio + API route handlers
packages/spec       WorkflowSpec Zod schema, binding resolver, semantic validator
packages/db         Drizzle schema, migrations, typed client + query helpers
packages/connectors connector SDK + registry + crypto + OAuth helper + built-ins (fixture/live)
packages/engine     deterministic spec interpreter (runs, steps, approvals, retries, resume)
packages/builder    NL → spec compile, edit → diff, explain, TS codegen, prompts
packages/evals      golden generation cases (mocked CI + live)
```

## License

[Apache-2.0](./LICENSE).
