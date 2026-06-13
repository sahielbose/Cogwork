import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogwork — Describe it. Review it. Let it run.",
  description:
    "Open-source, AI-native workflow automation. Turn plain-English instructions into reliable, readable, auditable automations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
