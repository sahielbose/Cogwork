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
