"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Play,
  Sparkles,
  Webhook,
  Box,
  type LucideIcon,
} from "lucide-react";
import { Badge, statusToBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CogNodeData } from "./spec-to-flow";

const ICONS: Record<string, LucideIcon> = {
  schedule: Clock,
  webhook: Webhook,
  manual: Play,
  ai: Sparkles,
  gmail: Mail,
  gcal: Calendar,
  slack: MessageSquare,
};

export function CogNodeCard({ data, selected }: NodeProps) {
  const d = data as CogNodeData;
  const Icon = ICONS[d.provider] ?? Box;
  const badge = d.status ? statusToBadge(d.status) : null;
  const isTrigger = d.kind === "trigger";

  return (
    <div
      className={cn(
        "w-[260px] rounded-lg border bg-paper shadow-sm transition-shadow",
        selected ? "border-violet ring-2 ring-violet/30" : "border-line",
      )}
    >
      {!isTrigger && <Handle type="target" position={Position.Top} className="!bg-subtle !w-2 !h-2" />}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-md",
            d.kind === "ai" ? "bg-violet-tint text-violet" : isTrigger ? "bg-paper-3 text-graphite" : "bg-paper-3 text-ink-soft",
          )}
        >
          <Icon size={14} />
        </span>
        <span className="flex-1 truncate font-mono text-[12px] text-ink">{d.title}</span>
        {badge && <Badge kind={badge.kind}>{badge.label}</Badge>}
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-medium capitalize text-ink">{d.subtitle}</div>
        {d.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.badges.map((b) => (
              <span
                key={b}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  b === "approval" ? "bg-amber-tint text-amber" : "bg-paper-3 text-muted",
                )}
              >
                {b === "approval" ? "needs approval" : b}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-subtle !w-2 !h-2" />
    </div>
  );
}
