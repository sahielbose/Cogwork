"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function clone() {
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/clone`, { method: "POST" });
      const data = await res.json();
      if (data.workflowId) router.push(`/builder?id=${data.workflowId}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" className="w-full" disabled={busy} onClick={clone}>
      {busy ? "Cloning…" : "Use template →"}
    </Button>
  );
}
