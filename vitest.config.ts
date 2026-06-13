import { defineConfig } from "vitest/config";

// Root Vitest config. Each package/app declares its own project via
// vitest.config.ts; this root aggregates them so `vitest run` exercises the
// whole monorepo in one pass (the green gate's test step).
export default defineConfig({
  test: {
    // The empty repo has no tests yet; real tests land in Stage A onward.
    passWithNoTests: true,
    projects: ["packages/*/vitest.config.ts", "apps/*/vitest.config.ts"],
  },
});
