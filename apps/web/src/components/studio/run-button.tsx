"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function RunButton({
  workflowId,
  label = "Run",
  size = "sm",
  variant = "secondary",
}: {
  workflowId: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" });
      const data = await res.json();
      if (data.runId) router.push(`/runs/${data.runId}`);
      else router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={run} disabled={running}>
      <Play size={14} />
      {running ? "Running…" : label}
    </Button>
  );
}
