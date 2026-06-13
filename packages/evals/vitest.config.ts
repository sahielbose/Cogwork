import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "evals",
    environment: "node",
    include: ["src/**/*.test.ts", "cases/**/*.test.ts"],
    passWithNoTests: true,
    // Live evals (real Anthropic) can be slow; allow more time.
    testTimeout: process.env.COGWORK_EVAL_MODE === "live" ? 60_000 : 10_000,
  },
});
