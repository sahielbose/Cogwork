import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { DISCORD_URL, GITHUB_URL } from "@/lib/site";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Demos", href: "/demos" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Self-host guide", href: "/docs" },
      { label: "Contributing", href: GITHUB_URL, external: true },
      { label: "License (Apache-2.0)", href: GITHUB_URL, external: true },
      { label: "For AI agents (llms.txt)", href: "/llms.txt", external: true },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: DISCORD_URL, external: true },
      { label: "X", href: "https://x.com", external: true },
      { label: "YouTube", href: "https://youtube.com", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Contact", href: GITHUB_URL, external: true },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <div className="mx-auto grid max-w-container grid-cols-2 gap-8 px-6 py-12 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <Wordmark markSize={22} />
          <p className="mt-3 text-sm text-muted">Open-source workflow automation.</p>
          <p className="mt-1 text-xs text-subtle">© 2026 Cogwork.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="eyebrow mb-3">{col.title}</div>
            <ul className="space-y-2 text-sm text-ink-soft">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-ink">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="hover:text-ink">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
