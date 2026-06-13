import type { Config } from "tailwindcss";

// Full Cogwork design tokens are wired in Stage F (COGWORK_UI.md §2).
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
