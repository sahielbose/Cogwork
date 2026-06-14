import { getConnectorRegistry } from "@cogwork/connectors";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Integrations — Cogwork" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  ai: "AI (Anthropic)",
  google: "Google (Gmail + Calendar)",
  slack: "Slack",
  notion: "Notion",
  github: "GitHub",
  postgres: "Postgres",
  apify: "Apify",
  http: "HTTP",
};

export default function IntegrationsPage() {
  const connectors = getConnectorRegistry();
  const total = connectors.reduce((n, c) => n + c.actions.length, 0);

  return (
    <div className="mx-auto max-w-container px-6 py-20">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold">Integrations</h1>
        <p className="mt-3 text-muted">
          {connectors.length} connectors · {total} actions. Modular and open source — add your own.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connectors.map((c) => (
          <Card key={c.provider} className="p-5">
            <div className="font-medium text-ink">{LABEL[c.provider] ?? c.provider}</div>
            <div className="mt-1 text-xs text-muted">{c.authType}</div>
            <ul className="mt-3 space-y-1">
              {c.actions.map((a) => (
                <li key={a.name} className="flex items-center gap-2 text-sm text-ink-soft">
                  <code className="font-mono text-[11px] text-muted">{a.name}</code>
                  {a.sideEffect && (
                    <span className="rounded-full bg-amber-tint px-1.5 text-[9px] text-amber">gated</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
