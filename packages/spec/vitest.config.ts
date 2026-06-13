import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "spec",
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
