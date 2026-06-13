import { config } from "dotenv";
import { getDb } from "@cogwork/db";
import { createScheduler } from "./pgboss";
import { startWorker } from "./worker";

// Load the monorepo-root .env (script runs with packages/scheduler as cwd).
config({ path: "../../.env" });
config();

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const scheduler = createScheduler(url);
  const { stop } = await startWorker(getDb(), scheduler);
  console.log("✓ Cogwork scheduler worker started (pg-boss). Crons + run queue active.");

  const shutdown = async () => {
    await stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
