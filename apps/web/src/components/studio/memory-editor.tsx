"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Pref {
  key: string;
  value: unknown;
  updatedAt: string | Date;
}

function display(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function MemoryEditor({ initial }: { initial: Pref[] }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(key: string, value: string) {
    setBusy(true);
    try {
      await fetch(`/api/preferences/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    setBusy(true);
    try {
      await fetch(`/api/preferences/${encodeURIComponent(key)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Cogwork uses these to match your style — formats, default channels, tone. They&apos;re
        injected into the Builder when it generates and edits workflows.
      </p>

      {initial.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          Nothing remembered yet. Add a preference below, or tell the builder &quot;remember that
          I…&quot;.
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {initial.map((p) => (
            <PrefRow key={p.key} pref={p} onSave={save} onDelete={remove} busy={busy} />
          ))}
        </Card>
      )}

      <Card className="p-4">
        <div className="text-xs font-semibold text-ink-soft mb-2">Add a preference</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="key (e.g. default_slack_channel)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="max-w-xs font-mono text-xs"
          />
          <Input
            placeholder="value (e.g. #general)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="max-w-xs"
          />
          <Button
            size="sm"
            disabled={busy || !newKey.trim() || !newValue.trim()}
            onClick={async () => {
              await save(newKey.trim(), newValue.trim());
              setNewKey("");
              setNewValue("");
            }}
          >
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PrefRow({
  pref,
  onSave,
  onDelete,
  busy,
}: {
  pref: Pref;
  onSave: (k: string, v: string) => void;
  onDelete: (k: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState(display(pref.value));
  const dirty = value !== display(pref.value);
  const updated =
    typeof pref.updatedAt === "string" ? pref.updatedAt.slice(0, 10) : pref.updatedAt.toISOString().slice(0, 10);
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="w-48 truncate font-mono text-xs text-ink-soft">{pref.key}</span>
      <Input value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
      <span className="hidden w-24 shrink-0 text-right text-[11px] text-subtle sm:inline">
        updated {updated}
      </span>
      <Button size="sm" variant="secondary" disabled={busy || !dirty} onClick={() => onSave(pref.key, value)}>
        Save
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(pref.key)}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
