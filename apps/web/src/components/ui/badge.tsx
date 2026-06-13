import * as React from "react";
import { cn } from "@/lib/utils";

/** Status → meaning (COGWORK_UI.md §3.2). Status is never color-only. */
export type StatusKind =
  | "live"
  | "running"
  | "draft"
  | "paused"
  | "awaiting"
  | "succeeded"
  | "failed"
  | "reconnect"
  | "queued"
  | "skipped"
  | "neutral";

const STYLES: Record<StatusKind, string> = {
  live: "bg-green-tint text-green",
  running: "bg-green-tint text-green",
  succeeded: "bg-green-tint text-green",
  draft: "bg-paper-3 text-muted",
  neutral: "bg-paper-3 text-muted",
  queued: "bg-paper-3 text-muted",
  skipped: "bg-paper-3 text-subtle",
  paused: "bg-amber-tint text-amber",
  awaiting: "bg-amber-tint text-amber",
  reconnect: "bg-red-tint text-red",
  failed: "bg-red-tint text-red",
};

const DOT: Partial<Record<StatusKind, boolean>> = { live: true, running: true };

export function Badge({
  kind = "neutral",
  className,
  children,
}: {
  kind?: StatusKind;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 h-[22px] text-[11px] font-medium",
        STYLES[kind],
        className,
      )}
    >
      {DOT[kind] && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Map a run/run-step status string to a badge kind + label. */
export function statusToBadge(status: string): { kind: StatusKind; label: string } {
  switch (status) {
    case "succeeded":
      return { kind: "succeeded", label: "Succeeded" };
    case "running":
      return { kind: "running", label: "Running" };
    case "failed":
      return { kind: "failed", label: "Failed" };
    case "awaiting_approval":
      return { kind: "awaiting", label: "Needs approval" };
    case "pending":
      return { kind: "neutral", label: "Pending" };
    case "queued":
      return { kind: "queued", label: "Queued" };
    case "skipped":
      return { kind: "skipped", label: "Skipped" };
    case "active":
      return { kind: "live", label: "Active" };
    case "paused":
      return { kind: "paused", label: "Paused" };
    case "draft":
      return { kind: "draft", label: "Draft" };
    case "cancelled":
      return { kind: "neutral", label: "Cancelled" };
    default:
      return { kind: "neutral", label: status };
  }
}
