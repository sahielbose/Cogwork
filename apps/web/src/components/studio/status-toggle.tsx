"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Pause an active workflow or activate a paused/draft one (dashboard quick action). */
export function StatusToggle({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = status === "active";

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/workflows/${id}/${active ? "pause" : "activate"}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" disabled={busy} onClick={toggle}>
      {busy ? "…" : active ? "Pause" : "Activate"}
    </Button>
  );
}
