"use client";

import type { WorkflowSpec } from "@cogwork/spec";
import { AlertTriangle, CheckCircle2, Loader2, Play, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { FlowCanvas } from "@/components/flow/canvas";
import { specToFlow } from "@/components/flow/spec-to-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "Every weekday at 8am, summarize my unread Gmail from the last day, draft replies, and DM me a rundown on Slack.",
  "Every morning at 9, list today's calendar events and post them to Slack #general.",
  "When I run it, read my unread email and draft a reply to each one.",
];

export function BuilderStudio({
  initialSpec,
  initialWorkflowId,
  initialName,
}: {
  initialSpec?: WorkflowSpec;
  initialWorkflowId?: string;
  initialName?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [spec, setSpec] = useState<WorkflowSpec | null>(initialSpec ?? null);
  const [summary, setSummary] = useState("");
  const [valid, setValid] = useState(Boolean(initialSpec));
  const [errors, setErrors] = useState<string[]>([]);
  const [name, setName] = useState(initialName ?? initialSpec?.name ?? "");
  const [workflowId, setWorkflowId] = useState<string | undefined>(initialWorkflowId);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<"summary" | "spec">("summary");
  const [notice, setNotice] = useState<string | null>(null);
  const dirtySinceSave = useRef(false);

  const flow = useMemo(() => (spec ? specToFlow(spec) : { nodes: [], edges: [] }), [spec]);

  async function generate(prompt: string) {
    if (!prompt.trim() || generating) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setGenerating(true);
    setNotice(null);
    try {
      // If a spec already exists, this is an edit; otherwise a fresh compile.
      const editing = Boolean(spec);
      const res = await fetch(editing ? "/api/builder/edit" : "/api/builder/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing ? { spec, instruction: prompt } : { prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.error ?? "Generation failed." }]);
        return;
      }
      if (data.valid && data.spec) {
        setSpec(data.spec);
        setSummary(data.summary);
        setValid(true);
        setErrors([]);
        setName(data.spec.name);
        setWorkflowId(undefined);
        dirtySinceSave.current = true;
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.summary || "Here's your workflow." },
        ]);
      } else {
        setValid(false);
        setErrors(data.errors ?? []);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "I couldn't produce a valid workflow. " + (data.errors?.join("; ") ?? "") },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong generating that." }]);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!spec) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || spec.name, spec, status: "active" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Could not save.");
        return;
      }
      setWorkflowId(data.workflow.id);
      dirtySinceSave.current = false;
      setNotice("Saved and activated.");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    if (!workflowId) return;
    setNotice(null);
    const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" });
    const data = await res.json();
    if (data.runId) router.push(`/runs/${data.runId}`);
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[360px_1fr_360px]">
      {/* Chat */}
      <div className="flex flex-col border-r border-line bg-paper">
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {messages.length === 0 && !spec && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Describe the workflow you want…</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => generate(ex)}
                  className="block w-full rounded-md border border-line bg-paper-2 p-3 text-left text-[13px] text-ink-soft hover:bg-paper-3"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-ink text-white rounded-tr-sm"
                  : "bg-paper-3 text-ink rounded-tl-sm",
              )}
            >
              {m.content}
            </div>
          ))}
          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" /> Generating…
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate(input);
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe or refine…"
          />
          <Button type="submit" size="sm" disabled={generating || !input.trim()}>
            <Send size={14} />
          </Button>
        </form>
      </div>

      {/* Canvas */}
      <div className="relative flex flex-col bg-paper-2">
        <div className="flex-1 dotted-grid">
          {spec ? (
            <FlowCanvas nodes={flow.nodes} edges={flow.edges} />
          ) : (
            <div className="grid h-full place-items-center text-center text-muted">
              <div>
                <p className="font-medium">Your workflow will appear here.</p>
                <p className="text-sm">Describe it in the chat to generate a flow.</p>
              </div>
            </div>
          )}
        </div>
        {/* Save bar */}
        <div className="flex items-center gap-3 border-t border-line bg-paper p-3">
          {valid ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green">
              <CheckCircle2 size={16} /> Valid
            </span>
          ) : errors.length ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-red">
              <AlertTriangle size={16} /> {errors.length} issue{errors.length === 1 ? "" : "s"}
            </span>
          ) : null}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name"
            className="max-w-xs"
            disabled={!spec}
          />
          <span className="flex-1" />
          {notice && <span className="text-xs text-muted">{notice}</span>}
          <Button variant="secondary" size="sm" disabled={!spec || !valid || saving} onClick={save}>
            {saving ? "Saving…" : workflowId && !dirtySinceSave.current ? "Saved ✓" : "Save & activate"}
          </Button>
          <Button size="sm" disabled={!workflowId} onClick={runNow}>
            <Play size={14} /> Run
          </Button>
        </div>
      </div>

      {/* Spec / Summary */}
      <div className="hidden flex-col border-l border-line bg-paper lg:flex">
        <div className="flex border-b border-line">
          {(["summary", "spec"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={cn(
                "flex-1 px-4 py-3 text-sm capitalize",
                panel === p ? "border-b-2 border-violet font-medium text-violet" : "text-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {!spec ? (
            <p className="text-sm text-muted">Generate a workflow to see its summary and spec.</p>
          ) : panel === "summary" ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-soft">{summary || spec.name}</pre>
          ) : (
            <pre className="overflow-auto font-mono text-[12px] text-ink-soft">
              {JSON.stringify(spec, null, 2)}
            </pre>
          )}
          {errors.length > 0 && (
            <div className="mt-4 rounded-md bg-red-tint p-3">
              <div className="text-xs font-semibold text-red">Validation issues</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-ink-soft">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
