"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ approvalId, runId }: { approvalId: string; runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function act(kind: "approve" | "reject") {
    setBusy(kind);
    try {
      await fetch(`/api/approvals/${approvalId}/${kind}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => act("reject")}>
        {busy === "reject" ? "Rejecting…" : "Reject"}
      </Button>
      <Button size="sm" disabled={busy !== null} onClick={() => act("approve")}>
        {busy === "approve" ? "Approving…" : "Approve"}
      </Button>
      <a href={`/runs/${runId}`} className="text-xs text-violet hover:underline">
        View run →
      </a>
    </div>
  );
}
