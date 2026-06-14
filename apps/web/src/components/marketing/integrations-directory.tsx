"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { metaFor } from "@/lib/integrations";
import { cn } from "@/lib/utils";

interface Conn {
  provider: string;
  authType: string;
  actions: { name: string; description: string; sideEffect: boolean }[];
}

export function IntegrationsDirectory({ connectors }: { connectors: Conn[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set(connectors.map((c) => metaFor(c.provider).category));
    return ["All", ...[...set].sort()];
  }, [connectors]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return connectors.filter((c) => {
      const meta = metaFor(c.provider);
      if (cat !== "All" && meta.category !== cat) return false;
      if (!term) return true;
      return (
        meta.label.toLowerCase().includes(term) ||
        c.provider.includes(term) ||
        meta.blurb.toLowerCase().includes(term) ||
        c.actions.some((a) => a.name.includes(term))
      );
    });
  }, [connectors, q, cat]);

  return (
    <>
      <div className="mt-8 flex flex-col items-center gap-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search integrations…"
          className="max-w-md"
          aria-label="Search integrations"
        />
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                cat === c ? "bg-ink text-white" : "bg-paper-3 text-muted hover:bg-line",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted">No integrations match &ldquo;{q}&rdquo;.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const meta = metaFor(c.provider);
            return (
              <Link key={c.provider} href={`/integrations/${c.provider}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-ink">{meta.label}</div>
                    <Badge kind="neutral">Available</Badge>
                  </div>
                  <div className="mt-1 text-xs text-violet">{meta.category}</div>
                  <p className="mt-2 text-sm text-muted">{meta.blurb}</p>
                  <div className="mt-3 text-xs text-subtle">
                    {c.actions.length} action{c.actions.length === 1 ? "" : "s"}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
