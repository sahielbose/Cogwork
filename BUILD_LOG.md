# Cogwork — Build Log

Append-only, terse. One line per meaningful event. Times are local (America/Los_Angeles).

Format: `YYYY-MM-DD HH:MM  StageX  done|BLOCKED|note: <message>  [commit shortsha]`

---

2026-06-13 14:44  Setup   env verified: node 25.9, pnpm 10.13, docker(colima) up, git+gh authed (sahielbose)
2026-06-13 14:44  Setup   note: host postgres on :5432 + docker pg on :5433/:5434 — Cogwork DB runs on :5435 (docker run; compose plugin is a broken symlink to absent Docker Desktop)
2026-06-13 14:44  Setup   note: ANTHROPIC_API_KEY not present in env/.env — left blank; generation code is real (AI SDK + Anthropic) but live generation needs the human to add the key. Tests mock the LLM (per spec §23.3).
2026-06-13 14:44  Setup   .env written from .env.example; ENCRYPTION_KEY + AUTH_SECRET generated; COGWORK_CONNECTORS=fixture
2026-06-13 14:44  StageB  note: DB helper/integration tests use embedded pglite (real Postgres in WASM) so the green gate never depends on Docker; db:push/db:migrate target real Postgres via DATABASE_URL.
2026-06-13 15:05  Stage0  done: monorepo bootstrap green (typecheck+lint+test+build all pass on empty repo); 8 logical commits.
2026-06-13 15:06  Stage0  BLOCKED: `git push` of .github/workflows/* rejected — gh OAuth token lacks `workflow` scope. Workaround: CI defs staged in ci/ (reviewable, ready); human runs `gh auth refresh -s workflow` then moves them (see ci/README.md). Does not affect local green gate.
2026-06-13 15:18  StageA  done: packages/spec — schema (WorkflowSpecSchema), binding resolver + condition grammar, semantic validator (5 checks of §4.4) + approval inference. 35 tests (resolver + validator table cases). Green gate ✓.
2026-06-13 15:30  StageB  done: packages/db — Drizzle schema (all 10 v1 tables) + generated migrations, postgres.js client, migrate runner, typed query helpers (prefs/users/workflows/runs/steps/approvals/audit). db:push applies cleanly to real PG :5435; 5 helper tests vs pglite. Green gate ✓.
