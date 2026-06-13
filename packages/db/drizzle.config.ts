import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the monorepo-root .env (drizzle-kit runs with packages/db as cwd).
config({ path: "../../.env" });
config(); // also pick up a local .env if present

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://cogwork:cogwork@localhost:5432/cogwork",
  },
  strict: true,
  verbose: true,
});
