import type { Config } from "tailwindcss";

// Cogwork theme — maps design tokens (styles/tokens.css) into Tailwind.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "var(--ink)", soft: "var(--ink-soft)" },
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        paper: { DEFAULT: "var(--paper)", 2: "var(--paper-2)", 3: "var(--paper-3)" },
        graphite: "var(--graphite)",
        violet: {
          DEFAULT: "var(--violet)",
          hover: "var(--violet-hover)",
          tint: "var(--violet-tint)",
        },
        green: { DEFAULT: "var(--green)", tint: "var(--green-tint)" },
        amber: { DEFAULT: "var(--amber)", tint: "var(--amber-tint)" },
        red: { DEFAULT: "var(--red)", tint: "var(--red-tint)" },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        focus: "var(--shadow-focus)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { container: "1200px", app: "1120px" },
      keyframes: {
        "pulse-dot": {
          "0%": { offsetDistance: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { offsetDistance: "100%", opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 240ms cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
