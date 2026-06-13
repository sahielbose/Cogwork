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
