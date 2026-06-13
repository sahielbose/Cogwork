# Cogwork — Build & Execution Guide

> **Reads with:** `COGWORK_CONTEXT.md` (product + architecture) and `COGWORK_UI.md` (frontend). This file is the **operational playbook**: the exact order to build in, what each step produces, the acceptance gate for each, and where to commit. It is written to be executed **autonomously by Claude Code through Phases 0 → 1 → 2**, with many small commits, and to **hard-stop before Phase 3**. The copy-paste **kickoff prompt is in §10**.

---

## 1. Operating rules (non-negotiable — the agent follows these the whole way)

1. **Read first.** Before writing anything, read `COGWORK_CONTEXT.md` and `COGWORK_UI.md` in full. They are the source of truth; this guide is the order of operations.
2. **Build in sequence.** Follow the stages in §4–§7 in order. Do not jump ahead. Each stage depends on the previous one being green.
3. **Many small commits.** Commit at the granularity of a logical unit (a schema, a resolver, one connector, one route, one page). Expect **dozens of commits per phase**. The checklists below are the *minimum* checkpoints, not the maximum.
4. **The green gate — run before EVERY commit:**
   ```
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```
   If any fails, fix it before committing. **Never commit red.**
5. **Fixture mode only.** Run with `COGWORK_CONNECTORS=fixture`. The **only** live external dependency is the Anthropic API (key already in `.env`). Do not call real Gmail/Slack/Notion/etc.
6. **Do NOT start Phase 3.** No creating OAuth apps, no flipping connectors to live, no Slack bot, no MCP server, no CLI, no billing, no multi-tenant. When Phase 2 is complete, **stop and report** (§9).
7. **No fake "done".** The items marked **MUST BE REAL** (workflow generation §9.1, the semantic validator §4.4, the engine loop §10 of the context file) are never stubbed. If you can't make one real, stop and log it — don't paper over it.
8. **Never fake tests.** Don't write tests that assert nothing, skip silently, or hard-code expected values to pass. A green suite must mean the logic works.
9. **Conventional commits** (`feat: / fix: / test: / refactor: / chore: / docs:` + scope), e.g. `feat(spec): semantic validator`. Push after each commit (or each small batch).
10. **End of each phase:** run the full suite, `git tag` the phase, and append a short report to `PHASE_REPORTS.md` (§8).
11. **Autonomy + resumability.** Work continuously without pausing for confirmation between steps. Keep `BUILD_LOG.md` updated (§8). On (re)start, read `BUILD_LOG.md` and `git log` to see what's done and **resume from there** — committing continuously means progress is never lost.
12. **When blocked:** write the blocker to `BUILD_LOG.md`, skip the smallest unit that's blocked, continue with everything else, and surface it in the phase report. Do not invent credentials and do not start Phase 3 to "unblock".

---

## 2. Environment & prerequisites (assumed present)

- **Node 20+**, **pnpm**, **Docker** (for Postgres).
- **`ANTHROPIC_API_KEY`** is set (you have it) — used live for generation + AI steps from Phase 0.
- Generate the two local secrets and write `.env` from `.env.example`:
  ```bash
  cp .env.example .env
  echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
  echo "AUTH_SECRET=$(openssl rand -base64 32)"   >> .env
  echo "COGWORK_CONNECTORS=fixture"               >> .env
  ```
- OAuth client IDs/secrets and the Apify key are **NOT needed** for Phases 0–2 (fixture mode). They're a Phase-3 concern (§21.C of the context file).

---

## 3. Stage 0 — Repo bootstrap

**Goal:** a green, empty monorepo with all tooling, CI, and the green-gate scripts wired.

**Create:**
- pnpm + **Turborepo** monorepo; workspaces `apps/*`, `packages/*`.
- Root config: `tsconfig.base.json`, ESLint (typescript-eslint), Prettier, **Vitest** (workspace), `turbo.json`.
- Root scripts (the green gate): `typecheck` (tsc --noEmit across workspaces), `lint`, `test` (vitest run), `build` (turbo build), `dev` (turbo dev), `db:push`, `db:migrate`.
- `docker-compose.yml` (Postgres 16, optional pgvector), `.env.example` (per §18.1 of the context file).
- `apps/web` (Next.js App Router + TS + Tailwind + shadcn init, restyled to tokens later), empty.
- Empty package skeletons: `packages/spec`, `packages/db`, `packages/connectors`, `packages/engine`, `packages/builder`, `packages/evals`.
- **CI:** `.github/workflows/ci.yml` — on push/PR: install → typecheck → lint → test → build (fixture mode, mocked LLM). Plus `.github/workflows/evals.yml` — manual/nightly, live evals using the `ANTHROPIC_API_KEY` secret.
- `README.md` (run instructions), `BUILD_LOG.md`, `PHASE_REPORTS.md` (empty headers).

**Steps (commits):**
1. `chore: init pnpm + turborepo monorepo` — workspaces, root package.json, turbo.json.
2. `chore: base tsconfig, eslint, prettier`
3. `chore: vitest workspace + green-gate scripts`
4. `chore: docker-compose postgres + .env.example`
5. `chore: scaffold apps/web (next + tailwind + shadcn)`
6. `chore: scaffold empty packages (spec/db/connectors/engine/builder/evals)`
7. `ci: add CI (typecheck/lint/test/build) + evals workflow`
8. `docs: README, BUILD_LOG, PHASE_REPORTS`

**Acceptance:** `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass on an empty repo; `docker compose up -d` brings up Postgres; CI is green. **Then commit, push, continue.**

---

## 4. PHASE 0 — Prove the core loop (generate → run → trace)

> Outcome: type a prompt → real spec (Anthropic) → run it manually against **fixture** Gmail/Calendar/Slack → see a real run trace, approving the gated draft step. Everything credential-free except Anthropic.

### Stage A — `packages/spec`  *(MUST BE REAL: the validator)*
**Goal:** the DSL, the binding resolver, and the semantic validator.
**Create:** `schema.ts` (Zod `WorkflowSpecSchema` per §4.1), `resolve.ts` (mustache-style binding resolver per §4.2, **no eval**), `validate.ts` (semantic validation per §4.4: tool exists, params type-check vs connector schema, bindings resolve, approval inference), `index.ts`.
**Steps (commits):**
1. `feat(spec): WorkflowSpec zod schema + types`
2. `feat(spec): binding resolver` + `test(spec): resolver cases`
3. `feat(spec): semantic validator (validateSpec)` + `test(spec): validator table cases` (tool-missing, bad param, unresolvable binding, forEach/item misuse, approval inference).
**Acceptance:** validator unit tests cover each failure class and a valid spec; resolver handles `{{ step.out }}`, `{{ item.* }}`, `{{ trigger.* }}`; green gate passes.

### Stage B — `packages/db`
**Goal:** the full data model + migrations + typed client.
**Create:** Drizzle schema for every table in §7 of the context file (`users, connections, workflows, workflow_versions, runs, run_steps, approvals, preferences, audit_log, api_keys`), migrations, `client.ts`, and small typed query helpers used by other packages (`loadPreferences`, run/step writers, etc.).
**Steps (commits):**
1. `feat(db): drizzle schema (all v1 tables)`
2. `feat(db): migrations + client`
3. `feat(db): query helpers (prefs, runs, steps, approvals)` + `test(db): helpers against test db`
**Acceptance:** `pnpm db:push` applies cleanly to the docker Postgres; helper tests pass against a test database; green gate passes.

### Stage C — `packages/connectors` (+ Phase-0 connectors)
**Goal:** connector SDK + registry + OAuth2 helper + token crypto + **fixture/live run modes** (§11.4) + the four Phase-0 connectors with fixtures.
**Create:** `core/types.ts` (`Connector`, `ConnectorAction`, `ConnectorContext`), `core/registry.ts` (register + `getToolCatalog()` serialized for the builder), `core/oauth.ts` (authorize/callback/refresh helper — code built now, exercised live only at go-live), `core/crypto.ts` (AES-256-GCM token encrypt/decrypt), `core/run-mode.ts` (fixture vs live switch). Then `ai/` (`ai.generate` via Vercel AI SDK + Anthropic — **live**), `gmail/`, `gcal/`, `slack/` (each: actions with Zod I/O, `sideEffect` flags, **fixture JSON** next to each action).
**Steps (commits):**
1. `feat(connectors): SDK interfaces + registry + getToolCatalog`
2. `feat(connectors): AES-256-GCM token crypto` + `test`
3. `feat(connectors): oauth2 helper (authorize/callback/refresh)` *(code only; not run live)*
4. `feat(connectors): fixture/live run-mode switch`
5. `feat(connectors): ai.generate (live, AI SDK + anthropic)` + `test (mocked)`
6. `feat(connectors): gmail actions + fixtures` + `test(connectors): gmail fixture mapping`
7. `feat(connectors): gcal actions + fixtures` + `test`
8. `feat(connectors): slack actions + fixtures` + `test`
**Acceptance:** in fixture mode each action returns data that **passes its own `outputSchema`**; `getToolCatalog()` lists all actions with schemas + `sideEffect`; crypto round-trips; green gate passes.

### Stage D — `packages/engine`  *(MUST BE REAL: the interpreter)*
**Goal:** deterministic spec interpreter for **manual runs** with bindings, `run_steps`, one approval gate, redaction.
**Create:** `run.ts` (the loop per §10 of the context file), `redact.ts` (secrets/PII before persisting), `idempotency.ts` (key gen), `context.ts` (rebuild run context from `run_steps` — resume-safe).
**Steps (commits):**
1. `feat(engine): redaction` + `test`
2. `feat(engine): idempotency key gen` + `test`
3. `feat(engine): interpreter (manual run, bindings, run_steps)` + `test(engine): runs a spec with fixture connectors end-to-end`
4. `feat(engine): approval gate (pause → awaiting_approval)` + `test(engine): pauses on side-effect step`
**Acceptance:** an integration test runs a multi-step spec with fixture connectors and asserts `run_steps`, output bindings, and a pause on a `sideEffect` step; redaction strips secret fields before persist; green gate passes.

### Stage E — `packages/builder` + `packages/evals`  *(MUST BE REAL: generation)*
**Goal:** NL → validated spec (with repair loop), plain-English summary, TS export (read-only), and the generation acceptance test.
**Create:** `compile.ts` (per §9.1: structured output via `generateObject` + `WorkflowSpecSchema`, catalog injection from `getToolCatalog()`, preferences, **validate-and-repair loop**, with the `generateText`+`safeParse` fallback), `explain.ts` (spec → summary), `codegen.ts` (spec → readable TS, export-only), `prompts.ts` (DSL_REFERENCE + system prompt builder). In `evals`: `cases/morning-briefing.test.ts` (the §9.2 acceptance test) + a few more golden cases; an LLM mock for deterministic CI + a live-eval mode.
**Steps (commits):**
1. `feat(builder): system prompt + DSL reference + catalog injection`
2. `feat(builder): compile (generateObject + validate-and-repair)` + fallback
3. `feat(builder): explain (spec → summary)`
4. `feat(builder): codegen (spec → TS, export-only)`
5. `feat(evals): morning-briefing golden case (mocked + live modes)` + more cases
6. `test(builder): repair loop self-corrects an invalid spec` (mocked LLM returns bad→good)
**Acceptance:** the §9.2 test passes (compile the morning-briefing prompt → valid spec, right trigger, real tools, `validateSpec.ok`); the repair-loop test passes with a mocked LLM; deterministic CI uses the mock (no cost/flakiness); green gate passes.

### Stage F — `apps/web` (Phase-0 UI)
**Goal:** the studio shell + the four Phase-0 pages, wired to the packages, fixture connectors, **hero loop working**. Build to `COGWORK_UI.md` tokens/components.
**Create:** tokens.css + Tailwind/shadcn theme (restyled), fonts; Auth.js (email + Google login — login works; OAuth *connect* of providers is fixture/Phase-3); app shell (sidebar + top bar); **Builder** (three-pane: chat | flow canvas via `@xyflow/react` | spec/code), **Run detail**, **Connections** (fixture-mode banner), **Dashboard**; the API route handlers used by these (`/api/builder/compile`, `/api/workflows*`, `/api/runs*`, `/api/approvals*`, `/api/connectors`).
**Steps (commits):**
1. `feat(web): design tokens + tailwind theme + fonts`
2. `feat(web): auth.js (login) + app shell`
3. `feat(web): connectors registry route + Connections page (fixture banner)`
4. `feat(web): /api/builder/compile route`
5. `feat(web): Builder three-pane (chat + xyflow canvas + spec view)`
6. `feat(web): /api/workflows + save/activate`
7. `feat(web): /api/workflows/:id/run (manual) + engine wiring`
8. `feat(web): Run detail (step trace, redacted I/O, approve/reject)`
9. `feat(web): /api/approvals + Approvals resume`
10. `feat(web): Dashboard (workflows + recent runs + stats)`
11. `feat(web): flow canvas node cards + animated running edges` (the signature, §4 of the UI file)
**Acceptance (the Phase-0 definition of done):** from the Builder, type the morning-briefing prompt → a real generated workflow appears (summary + flow) → save → **run manually** against fixture Gmail/Calendar/Slack → approve the gated draft step → a real run trace with redacted step I/O shows. Green gate passes; `pnpm dev` serves it.

> ✅ **PHASE 0 COMPLETE** → run full suite, `git tag v0.0-phase0`, append `PHASE_REPORTS.md` (what works, the hero-loop result, any blockers), push tags, **continue to Phase 1**.

---

## 5. PHASE 1 — Make it run on its own (reliability + autonomy)

> Outcome: workflows fire on a schedule and by webhook; runs retry and resume; tokens don't expire mid-run (refresh code in place); approvals survive restarts. All code-complete in fixture mode.

### Stage G — scheduling, triggers, reliability
**Builds across:** `packages/engine`, `packages/connectors`, `apps/web`.
**Steps (commits):**
1. `feat(scheduler): pg-boss setup + worker` (Postgres-backed).
2. `feat(scheduler): register cron from schedule-trigger workflows` + `test`.
3. `feat(web): /api/hooks/:path webhook trigger → enqueue run` + `test`.
4. `feat(connectors): automatic OAuth refresh + needs_reauth flag` *(code built; exercised live only at go-live)* + `test (mocked)`.
5. `feat(engine): retries with backoff` + `test(engine): retry on transient failure`.
6. `feat(engine): partial-failure resume (skip succeeded steps)` + `test(engine): inject failure at step N → resume skips 1..N-1, no re-call`.
7. `feat(engine): durable approval pause/resume from DB` + `test(engine): resume after restart`.
8. `feat(engine): idempotency guards (provider keys + run_steps guard)` + `test(engine): retry does not double-invoke`.
9. `feat(engine): cost/token tracking per run` + `feat(web): run failure notice + "fix it" link`.
**Acceptance:** scheduled workflows fire via pg-boss (verify with a 1-min cron in a test); a failed step retries then the run resumes from the last good step without double-sending; an approval can be resolved after a simulated process restart and the run continues; green gate passes.

> ✅ **PHASE 1 COMPLETE** → full suite, `git tag v0.1-phase1`, append `PHASE_REPORTS.md`, push, **continue to Phase 2**.

---

## 6. PHASE 2 — Breadth + the rest of the functional surface

> Outcome: almost everything works — more connectors (fixture), memory, NL editing, templates, versions, export, audit log, evals, all app pages, and the marketing site **including the Open Source section**.

### Stage H — connectors, memory, editing, templates, versions, audit, evals
**Builds across:** all packages + `apps/web`.
**Steps (commits, group as sensible):**
1. `feat(connectors): notion actions + fixtures` + `test`
2. `feat(connectors): github actions + fixtures` + `test`
3. `feat(connectors): postgres actions (read + guarded execute) + fixtures` + `test`
4. `feat(connectors): apify (scraping) actions + fixtures` + `test`
5. `feat(connectors): http.request + fixtures` + `test`
6. `feat(builder): edit → spec diff (re-validated)` + `feat(web): chat editing in Builder` + `test`
7. `feat(memory): preferences read/write` + `feat(web): Memory page` + wire prefs into the builder prompt.
8. `feat(web): Templates gallery + clone-to-draft` + seed the 5 starter templates (§14.3 of the context file).
9. `feat(db/web): workflow versions + rollback UI`
10. `feat(web): TS export (read-only download)`
11. `feat(audit): write audit_log on key actions` + `feat(web): basic audit log view`
12. `feat(evals): broaden golden cases + wire into CI (mocked) and nightly (live)`
13. `feat(web): Workflow detail (Overview/Runs/Versions/Settings) + Approvals inbox + Settings (profile, API-keys UI, appearance)`

### Stage I — marketing site (incl. Open Source section)
**Builds:** `apps/web/(marketing)`.
**Steps (commits):**
1. `feat(web): marketing nav (pill) + footer`
2. `feat(web): Home hero (interactive workflow demo + tabs + canvas playback + typed-prompt motion)`
3. `feat(web): How it works (01/02/03) + community proof strip` *(real GitHub/Discord numbers or honest static fallbacks; NO investor logos)*
4. `feat(web): Why Cogwork + integration orbit`
5. `feat(web): conversational builder block`
6. `feat(web): Open Source section (repo card + terminal quickstart + GitHub/self-host CTAs)`  ← **the new section, §7 of the UI file**
7. `feat(web): FAQ + final CTA`
8. `feat(web): Pricing, Integrations directory, Templates/Demos, Docs shell, Legal, Auth pages`
9. `feat(web): nav GitHub link + footer open-source column + llms.txt`
**Acceptance (Phase-2 definition of done):** all ~9 connectors generate/run in fixture mode; editing a workflow by chat updates and re-validates; memory persists and personalizes generation; templates clone into drafts; versions roll back; TS export downloads; audit log records actions; the marketing site renders every section including the **Open Source** section with the repo card + terminal; green gate passes; `pnpm dev` serves the full site + studio.

> ✅ **PHASE 2 COMPLETE** → full suite, `git tag v0.2-phase2`, append `PHASE_REPORTS.md`, push, then **STOP** (§7).

---

## 7. STOP — Phase 3 is human-driven (do NOT start)

After Phase 2, **stop and report**. Do not begin any Phase-3 work: no creating OAuth apps, no flipping `COGWORK_CONNECTORS=live`, no real third-party API calls, no Slack bot, no MCP server, no CLI, no billing, no multi-tenant. These need the human (credentials, accounts, design decisions) per §21.B–C of the context file. Output the final report (§9).

---

## 8. Bookkeeping formats

**`BUILD_LOG.md`** — append-only, terse, one line per meaningful event:
```
2026-06-13 14:02  StageC  done: gmail connector + fixtures (3 actions)  [commit abc1234]
2026-06-13 14:31  StageD  BLOCKED: forEach aggregation edge case — using flat array for now, revisit
```

**`PHASE_REPORTS.md`** — one section per phase at completion:
```
## Phase 1 — complete (tag v0.1-phase1)
- Works: pg-boss cron fires; retry+resume verified; approval resume after restart; idempotency guard.
- Tests: 84 passing (unit + integration, fixture/mocked).
- Blockers/notes: needs_reauth UI is minimal; OAuth refresh untested live (Phase 3).
- Commits this phase: 37.
```

---

## 9. Final report (when stopping at end of Phase 2)
Output a concise summary:
- What's working end-to-end (the hero loop + breadth), with the commands to run it (`docker compose up -d && pnpm db:push && pnpm dev`).
- Test totals (passing) and CI status.
- The full list of what's deferred to Phase 3 (go-live + §21.B items).
- Exactly what the human must do to go live (the §21.C checklist: create OAuth apps, add keys, `COGWORK_CONNECTORS=live`, connect accounts).
- Tags created (`v0.0-phase0`, `v0.1-phase1`, `v0.2-phase2`) and total commit count.

---

## 10. Kickoff prompt for Claude Code

Paste this into Claude Code from the repo root (with the three `.md` files committed):

```
You are building Cogwork, an open-source AI-native workflow automation platform.
Read these three files in the repo in full before doing anything, and treat them as the source of truth:
- COGWORK_CONTEXT.md  (product + architecture + data model + the spec DSL + trust layer)
- COGWORK_UI.md       (design system + every page)
- COGWORK_BUILD.md    (the ordered build playbook — follow it exactly)

Your job: autonomously execute Phases 0, 1, and 2 from COGWORK_BUILD.md, in order, and then STOP.
Do NOT start Phase 3 (no creating OAuth apps, no live connectors, no Slack bot, MCP, CLI, billing, or multi-tenant).

Rules (from COGWORK_BUILD.md §1):
- Work continuously and autonomously. Do not pause to ask me for confirmation between steps. Make a plan/todo list and execute it.
- Commit in many small logical units (dozens per phase). Use Conventional Commits and push after each commit.
- Before EVERY commit, run the green gate and only commit if all pass:
    pnpm typecheck && pnpm lint && pnpm test && pnpm build
  Never commit red.
- Run in fixture mode (COGWORK_CONNECTORS=fixture). The ONLY live external dependency is the Anthropic API (ANTHROPIC_API_KEY is already in .env). Do not call any real third-party API (Gmail/Slack/Notion/etc.).
- These MUST BE REAL, never stubbed: workflow generation (COGWORK_CONTEXT.md §9.1), the semantic validator (§4.4), and the engine interpreter (§10). The Phase-0 definition of done is: type a prompt -> a real generated, validated workflow -> run it manually against fixture connectors -> see a real run trace with an approval step. The hero workflow must be GENERATED from a prompt, not hardcoded.
- Do not fake tests (no empty asserts, no silent skips, no hard-coded pass). A green suite must mean the logic works.
- Keep BUILD_LOG.md updated as you go; at the end of each phase run the full suite, git tag it (v0.0-phase0 / v0.1-phase1 / v0.2-phase2), and append a section to PHASE_REPORTS.md.
- Resumability: if you restart, read BUILD_LOG.md and git log to see what's done and continue from there.
- If blocked, log it in BUILD_LOG.md, skip the smallest blocked unit, continue with everything else, and never invent credentials or start Phase 3 to unblock.

Setup first (COGWORK_BUILD.md §2–§3): bootstrap the monorepo, write .env from .env.example, generate ENCRYPTION_KEY and AUTH_SECRET, bring up Postgres (docker compose up -d), and confirm the green gate passes on the empty repo. Then build Stage A through Stage I exactly as written.

When Phase 2 is complete, STOP and print the final report (COGWORK_BUILD.md §9): what works end-to-end + the commands to run it, test totals, what's deferred to Phase 3, and the exact go-live checklist I (the human) must do.

Begin.
```

---

*End of Cogwork build & execution guide.*
