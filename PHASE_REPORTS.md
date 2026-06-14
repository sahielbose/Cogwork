# Cogwork — Phase Reports

One section per phase at completion (tests, what works, blockers, commit count).

<!-- Sections appended at each phase tag: v0.0-phase0 / v0.1-phase1 / v0.2-phase2 -->

## Phase 0 — complete (tag v0.0-phase0)

**Outcome:** the core loop is real — generate → validate → run → trace, with an approval gate, against fixture connectors. Everything credential-free except live generation (Anthropic).

- **Works end-to-end (verified on a live dev server):** sign in (credential-free email login) → create a workflow → **run** it manually against fixture Gmail/Calendar/Slack → the side-effect step **pauses** (`awaiting_approval`) → **approve** → run **resumes** from DB state → **succeeded**. The run trace shows per-step status, redacted I/O (PII masked, e.g. `y***@yourco.com`), duration, and tokens/cost.
- **The 3 MUST-BE-REAL pieces are real, not stubbed:**
  - Semantic validator (`@cogwork/spec`, §4.4): 5 checks + approval inference, table-tested.
  - Engine interpreter (`@cogwork/engine`, §10): bindings, run_steps, retries, approval pause/resume, idempotent (no double-invoke on resume), redaction, cost tracking.
  - Generation (`@cogwork/builder`, §9.1): `generateObject` + catalog injection + validate-and-repair loop + `generateText` fallback. The §9.2 golden case passes (mocked). The compile route is wired and returns an honest "set ANTHROPIC_API_KEY" message until the key is provided.
- **Studio UI:** design tokens/theme/fonts, UI kit, Auth.js login, app shell, Builder three-pane (chat + xyflow flow canvas + spec view), Dashboard, Run detail, Connections (fixture banner), Approvals inbox.
- **Tests:** 90 passing across 15 files (spec, db [pglite], connectors, engine [e2e run/pause/resume], builder [repair loop], evals [golden cases], all fixture/mocked).
- **Blockers/notes:**
  - **ANTHROPIC_API_KEY not present** → live generation-from-a-prompt couldn't be exercised by the agent. The code is real and the mocked pipeline test passes; the human adds the key to `.env` and the Builder generates for real. The run→approve→trace loop is fully verified without it.
  - CI workflow files staged in `ci/` pending a `gh auth refresh -s workflow` (token lacks `workflow` scope). See `ci/README.md`.
  - DB tests use embedded pglite so the green gate never needs Docker; `db:push` verified against real Postgres.
- **Commits this phase (incl. Stage 0 bootstrap):** 43.

## Phase 1 — complete (tag v0.1-phase1)

**Outcome:** workflows run on their own — schedules fire, webhooks trigger runs, runs retry and resume, approvals survive restarts. All code-complete in fixture mode.

- **Works:**
  - **Scheduler (pg-boss):** `@cogwork/scheduler` syncs per-workflow cron schedules from the DB and runs a queue worker (`runWorkflowJob`). **Verified against real Postgres**: cron registered + a queued job dequeued and executed to success. Sync logic unit-tested with a fake scheduler.
  - **Webhook triggers:** `POST /api/hooks/:path` resolves the active workflow and runs it with the body as `{{ trigger.payload }}` (engine test confirms the binding resolves).
  - **Retries with backoff:** transient failure → retry → success; exhausted retries → run marked `failed` (a real bug was caught here: failed runs weren't setting terminal status — now fixed).
  - **Partial-failure resume:** inject a failure at step N → resume skips steps 1..N-1 with **no re-invoke** (verified by call counts).
  - **Durable approval pause/resume:** an approval resolved after a fresh `executeRun` (simulated restart) continues from DB state to success.
  - **Idempotency:** `(run_id, step_id, item_index)` keys + reuse-on-success guard → retries don't double-invoke.
  - **OAuth refresh + `needs_reauth`:** `ensureFreshAccessToken` (refresh-when-expiring, carry refresh token, fail→reauth) + DB helpers to store refreshed tokens and flag dead connections. Code built; exercised live at go-live. Mocked tests.
  - **Cost/token tracking** per run; failed-run notice + "Open in Builder to fix it" link in Run detail.
- **Tests:** 105 passing across 18 files (added engine reliability, scheduler sync/handler, OAuth refresh, connection helpers).
- **Blockers/notes:** pg-boss firing isn't in the green gate (it needs a running Postgres + queue); it's covered by a fake-scheduler unit test plus a one-off real verification. The scheduler worker is a separate process: `pnpm worker`.
- **Commits this phase:** 5 (focused — much of the reliability layer was already real in the Phase-0 engine; Phase 1 hardened it, added the scheduler/webhooks/refresh, and proved it).

## Phase 2 — complete (tag v0.2-phase2)

**Outcome:** almost the entire product — all 9 connectors, memory, NL editing, templates, versions, export, audit, broader evals, every app page, and the full marketing site (incl. Open Source).

- **Connectors (9, fixture-backed):** ai, http, gmail, gcal, slack, notion, github, postgres (read + guarded execute — DDL rejected), apify. Every action's fixture passes its own outputSchema.
- **NL editing:** `editWorkflow` (current spec + instruction → re-validated new spec + step-level diff); chat editing wired in the Builder.
- **Memory:** preferences API + Memory editor page; preferences are injected into the Builder prompt at compile/edit time.
- **Templates:** 5 starter templates (all semantically valid) + gallery + clone-to-draft (in-app and on the marketing Demos page).
- **Versions/rollback:** every save snapshots a version; Workflow detail → Versions tab rolls back.
- **TS export:** read-only `.workflow.ts` download from Workflow detail.
- **Audit log:** writes on create/delete/activate/pause/run/approval/template-clone/rollback/preference; Activity view in Settings.
- **App pages:** Dashboard, Builder (three-pane), Run detail, Connections, Approvals, Templates, Memory, Workflow detail (Overview/Runs/Versions/Settings), Settings.
- **Marketing site:** Home (interactive hero with tabs + typed prompt + flow-canvas playback, how-it-works, community proof with **honest OSS signals — no investor logos**, why + integration orbit, conversational builder, **Open Source section** with repo card + real terminal quickstart, FAQ, final CTA), Pricing, Integrations directory (live registry), Demos, Docs shell, Legal, `llms.txt`. Verified rendering on a live dev server (all routes 200; screenshot confirmed).
- **Evals:** broadened golden cases (postgres/github/webhook) alongside the morning-briefing acceptance case; mocked in CI, live nightly.
- **Tests:** 126 passing across 20 files.
- **Blockers/notes:** live generation still needs `ANTHROPIC_API_KEY` (unchanged from Phase 0); everything else runs in fixture mode with no creds.
- **Commits this phase:** 12.
