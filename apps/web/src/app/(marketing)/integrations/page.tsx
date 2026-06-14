import { getConnectorRegistry } from "@cogwork/connectors";
import { IntegrationsDirectory } from "@/components/marketing/integrations-directory";

export const metadata = { title: "Integrations — Cogwork" };
export const dynamic = "force-dynamic";

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
      <IntegrationsDirectory connectors={connectors} />
    </div>
  );
}
