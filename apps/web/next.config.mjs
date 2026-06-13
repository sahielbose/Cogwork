import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// In a monorepo, Next loads .env from apps/web; our shared .env lives at the
// repo root. Load it here so DATABASE_URL / AUTH_SECRET / ENCRYPTION_KEY /
// ANTHROPIC_API_KEY / COGWORK_CONNECTORS reach the server process.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../.env") });
config(); // also pick up apps/web/.env(.local) if present (overrides)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript (no build step); Next transpiles them.
  transpilePackages: [
    "@cogwork/spec",
    "@cogwork/db",
    "@cogwork/connectors",
    "@cogwork/engine",
    "@cogwork/builder",
  ],
  eslint: {
    // Linting is run at the monorepo root via `pnpm lint`; skip Next's own pass.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
