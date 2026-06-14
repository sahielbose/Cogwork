import { listAudit } from "@cogwork/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  const audit = await listAudit(getDb(), user!.id, 25);

  return (
    <div className="mx-auto max-w-app p-6 space-y-6">
      <h2 className="font-display text-xl font-semibold">Settings</h2>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">Profile</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Name</dt>
          <dd>{user!.name || "—"}</dd>
          <dt className="text-muted">Email</dt>
          <dd>{user!.email}</dd>
        </dl>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-1">API keys</div>
        <p className="text-sm text-muted mb-3">
          Create <code className="font-mono text-xs">cw_…</code> keys with read / write / execute
          scopes for the API and MCP. Issuing + enforcement land with the API surface (Phase 3).
        </p>
        <Button size="sm" variant="secondary" disabled>
          Create key
        </Button>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-1">Appearance</div>
        <p className="text-sm text-muted">
          Cogwork ships light-theme first. A dark theme toggle arrives later.
        </p>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">Activity</div>
        {audit.length === 0 ? (
          <p className="text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono text-xs text-violet">{a.action}</span>
                <span className="text-muted">{a.entity}</span>
                <span className="flex-1" />
                <span className="text-xs text-subtle">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
