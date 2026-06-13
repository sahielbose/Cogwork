import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "builder",
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
