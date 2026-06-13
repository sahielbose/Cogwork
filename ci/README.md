# CI workflows (staged here pending `workflow` scope)

These GitHub Actions workflow definitions are **ready to use** but live under `ci/`
instead of `.github/workflows/` because the local push credential (the `gh` OAuth
token) lacks the `workflow` scope, which GitHub requires to push files under
`.github/workflows/`.

- `ci.yml` — green gate on every push/PR: install → typecheck → lint → test → build
  (fixture mode, mocked LLM, embedded pglite — no live third-party creds, no Postgres service).
- `evals.yml` — manual/nightly live generation evals against the real Anthropic API.

## To activate (one-time, ~30s)

```bash
gh auth refresh -s workflow        # grant the workflow scope
mkdir -p .github/workflows
git mv ci/ci.yml    .github/workflows/ci.yml
git mv ci/evals.yml .github/workflows/evals.yml
git commit -m "ci: activate workflows"
git push
```

Then add the `ANTHROPIC_API_KEY` repo secret (Settings → Secrets → Actions) so the
nightly live-evals workflow can run.
