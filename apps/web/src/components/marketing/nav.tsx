import { Github } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { GITHUB_URL } from "@/lib/site";

export function MarketingNav() {
  return (
    <header className="sticky top-4 z-50 mx-auto flex max-w-[960px] items-center justify-between gap-4 rounded-full border border-line bg-paper/90 px-5 py-2.5 shadow-lg backdrop-blur">
      <Link href="/">
        <Wordmark markSize={22} />
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
        <Link href="/demos" className="hover:text-ink">Demos</Link>
        <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        <Link href="/integrations" className="hover:text-ink">Integrations</Link>
        <Link href="/docs" className="hover:text-ink">Docs</Link>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
          <Github size={16} /> GitHub
        </a>
      </nav>
      <Link href="/login">
        <Button size="sm">Start free →</Button>
      </Link>
    </header>
  );
}
