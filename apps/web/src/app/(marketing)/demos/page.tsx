import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TEMPLATES } from "@/lib/templates";

export const metadata = { title: "Demos & templates — Cogwork" };

export default function DemosPage() {
  return (
    <div className="mx-auto max-w-container px-6 py-20">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold">Templates & demos</h1>
        <p className="mt-3 text-muted">Start from a prebuilt workflow — sign in to clone it into a draft.</p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="text-xs font-medium text-violet">{t.category}</div>
            <div className="mt-1 font-medium text-ink">{t.name}</div>
            <p className="mt-1 flex-1 text-sm text-muted">{t.description}</p>
            <p className="mt-3 rounded-md bg-paper-3 p-3 font-mono text-[11px] text-ink-soft">
              &ldquo;{t.prompt}&rdquo;
            </p>
            <div className="mt-3 mb-4 flex flex-wrap gap-1.5">
              {t.integrations.map((i) => (
                <span key={i} className="rounded-full bg-paper-3 px-2 py-0.5 text-[10px] font-mono text-muted">
                  {i}
                </span>
              ))}
            </div>
            <Link href="/login">
              <Button size="sm" className="w-full">Use this template →</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
