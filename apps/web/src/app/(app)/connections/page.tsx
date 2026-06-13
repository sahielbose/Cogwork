import { getConnectorRegistry } from "@cogwork/connectors";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COGWORK_RUN_MODE } from "@/lib/server";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google (Gmail + Calendar)",
  slack: "Slack",
  ai: "AI (Anthropic)",
  notion: "Notion",
  github: "GitHub",
  postgres: "Postgres",
  apify: "Apify",
  http: "HTTP",
};

export default function ConnectionsPage() {
  const connectors = getConnectorRegistry().filter((c) => c.provider !== "ai");
  const fixture = COGWORK_RUN_MODE === "fixture";

  return (
    <div className="mx-auto max-w-app p-6 space-y-6">
      {fixture && (
        <div className="flex items-start gap-3 rounded-lg border border-amber bg-amber-tint p-4">
          <Info size={18} className="text-amber mt-0.5 shrink-0" />
          <div className="text-sm text-ink-soft">
            Connectors are in <strong>fixture mode</strong> — every action returns realistic canned
            data, so the whole studio works with no third-party credentials. Flip to live in{" "}
            <code className="font-mono text-xs">.env</code> (
            <code className="font-mono text-xs">COGWORK_CONNECTORS=live</code>) after creating OAuth
            apps and connecting accounts at go-live.
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connectors.map((c) => (
          <Card key={c.provider} className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-medium text-ink">{PROVIDER_LABEL[c.provider] ?? c.provider}</div>
              <Badge kind={fixture ? "neutral" : "succeeded"}>
                {fixture ? "Available" : "Connected"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted">
              {c.actions.length} action{c.actions.length === 1 ? "" : "s"} · {c.authType}
            </div>
            {c.scopes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.scopes.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-paper-3 px-2 py-0.5 text-[10px] font-mono text-muted"
                  >
                    {s.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "")}
                  </span>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              disabled={fixture}
              title={fixture ? "Connecting is available at go-live (Phase 3)" : undefined}
            >
              {fixture ? "Connect at go-live" : "Connect"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
