import { getConnectorRegistry } from "@cogwork/connectors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { metaFor } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const conn = getConnectorRegistry().find((c) => c.provider === provider);
  if (!conn) notFound();
  const meta = metaFor(provider);
  const example = conn.actions[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/integrations" className="text-sm text-violet hover:underline">
        ← All integrations
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{meta.label}</h1>
        <Badge kind="neutral">Available</Badge>
        <span className="rounded-full bg-violet-tint px-2 py-0.5 text-xs text-violet">{meta.category}</span>
      </div>
      <p className="mt-2 text-muted">{meta.blurb}</p>
      <p className="mt-1 text-xs text-subtle">Auth: {conn.authType}</p>

      <h2 className="mt-8 font-display text-xl font-semibold">Actions</h2>
      <Card className="mt-3 divide-y divide-line">
        {conn.actions.map((a) => (
          <div key={a.name} className="flex items-center gap-3 p-4">
            <code className="font-mono text-sm text-ink">{a.name}</code>
            {a.sideEffect && <Badge kind="awaiting">approval-gated</Badge>}
            <span className="flex-1" />
            <span className="text-sm text-muted">{a.description}</span>
          </div>
        ))}
      </Card>

      {conn.scopes.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-xl font-semibold">Scopes</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {conn.scopes.map((s) => (
              <span key={s} className="rounded-full bg-paper-3 px-2 py-0.5 font-mono text-[11px] text-muted">
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      {example && (
        <>
          <h2 className="mt-8 font-display text-xl font-semibold">Example</h2>
          <pre className="mt-3 overflow-auto rounded-md bg-ink p-4 font-mono text-[12px] text-paper">
            {`{
  "id": "step_1",
  "tool": "${example.name}",
  "params": { }
}`}
          </pre>
        </>
      )}
    </div>
  );
}
