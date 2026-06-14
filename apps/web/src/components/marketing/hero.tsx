"use client";

import type { WorkflowSpec } from "@cogwork/spec";
import {
  Calendar,
  Github,
  Mail,
  MessageSquare,
  Box,
  FileText,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlowCanvas } from "@/components/flow/canvas";
import { specToFlow } from "@/components/flow/spec-to-flow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/site";

interface Demo {
  tab: string;
  prompt: string;
  spec: WorkflowSpec;
}

const DEMOS: Demo[] = [
  {
    tab: "Daily briefings",
    prompt:
      "Each weekday at 8am, summarize my unread email from the last day, draft replies in Gmail, and post a rundown of today's meetings to my Slack DMs.",
    spec: {
      version: 1,
      name: "Daily briefings",
      trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "UTC" },
      steps: [
        { id: "emails", tool: "gmail.list_messages", params: {}, outputs: ["messages"] },
        { id: "brief", tool: "ai.generate", params: {}, outputs: ["summary", "drafts"] },
        { id: "drafts", tool: "gmail.create_draft", forEach: "{{ brief.drafts }}", params: {}, approval: "required" },
        { id: "post", tool: "slack.post_message", params: {} },
      ],
    },
  },
  {
    tab: "Meeting follow-ups",
    prompt:
      "After each meeting, pull the notes from my docs, extract action items and owners, post a summary to the team Slack channel, and open tickets for anything that needs tracking.",
    spec: {
      version: 1,
      name: "Meeting follow-ups",
      trigger: { type: "schedule", cron: "0 17 * * 1-5", timezone: "UTC" },
      steps: [
        { id: "notes", tool: "notion.query_database", params: {}, outputs: ["pages"] },
        { id: "extract", tool: "ai.generate", params: {}, outputs: ["summary"] },
        { id: "post", tool: "slack.post_message", params: {} },
        { id: "ticket", tool: "github.create_issue", params: {}, approval: "required" },
      ],
    },
  },
  {
    tab: "Candidate sourcing",
    prompt:
      "Find engineers matching our hiring bar, score them by fit, log them to our recruiting database, and draft a tailored outreach note for each.",
    spec: {
      version: 1,
      name: "Candidate sourcing",
      trigger: { type: "manual" },
      steps: [
        { id: "search", tool: "apify.run_actor", params: {}, outputs: ["items"] },
        { id: "score", tool: "ai.generate", params: {}, outputs: ["summary", "drafts"] },
        { id: "log", tool: "notion.create_page", params: {}, approval: "required" },
        { id: "draft", tool: "gmail.create_draft", forEach: "{{ score.drafts }}", params: {}, approval: "required" },
      ],
    },
  },
  {
    tab: "Lead capture",
    prompt:
      "Watch for people asking for a tool like ours, enrich their profiles, and add qualified leads to our database with a fit score.",
    spec: {
      version: 1,
      name: "Lead capture",
      trigger: { type: "webhook", path: "leads" },
      steps: [
        { id: "enrich", tool: "apify.run_actor", params: {}, outputs: ["items"] },
        { id: "score", tool: "ai.generate", params: {}, outputs: ["summary"] },
        { id: "add", tool: "notion.create_page", params: {}, approval: "required" },
      ],
    },
  },
];

function useTypedPrompt(text: string): string {
  const [shown, setShown] = useState(text);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text]);
  return shown;
}

const PROVIDER_ICON: Record<string, LucideIcon> = {
  gmail: Mail,
  gcal: Calendar,
  slack: MessageSquare,
  ai: Sparkles,
  notion: FileText,
  github: Github,
  apify: Search,
};

export function Hero() {
  const [active, setActive] = useState(0);
  const demo = DEMOS[active]!;
  const typed = useTypedPrompt(demo.prompt);
  const flow = useMemo(() => specToFlow(demo.spec), [demo.spec]);
  const providers = useMemo(
    () => [...new Set(demo.spec.steps.map((s) => s.tool.split(".")[0]!))],
    [demo.spec],
  );

  return (
    <section className="mx-auto grid max-w-container gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
      <div>
        <div className="eyebrow">Open-source workflow automation</div>
        <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Describe it. Review it.{" "}
          <span className="bg-gradient-to-r from-[#6D28D9] via-[#5B2EE5] to-[#4F46E5] bg-clip-text text-transparent">
            Let it run.
          </span>
        </h1>
        <p className="mt-5 max-w-lg text-lg text-muted">
          Tell Cogwork what you want in plain words. It compiles a typed, reviewable workflow — then
          runs it on schedule, with every step traceable. Open source and self-hostable.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg">Start free →</Button>
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Button size="lg" variant="secondary">
              <Github size={18} /> View on GitHub
            </Button>
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-paper shadow-md">
        <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
          {DEMOS.map((d, i) => (
            <button
              key={d.tab}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px]",
                i === active ? "bg-ink text-white" : "text-muted hover:bg-paper-3",
              )}
            >
              {d.tab}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <div className="flex items-center gap-1.5">
            {providers.map((p) => {
              const Icon = PROVIDER_ICON[p] ?? Box;
              return (
                <span
                  key={p}
                  className="grid h-6 w-6 place-items-center rounded-md border border-line bg-paper-2 text-ink-soft"
                  title={p}
                >
                  <Icon size={13} />
                </span>
              );
            })}
          </div>
          <Link href="/login" className="text-xs font-medium text-violet hover:underline">
            Try this workflow →
          </Link>
        </div>
        <div className="px-4 pb-2 pt-3">
          <p className="min-h-[60px] font-mono text-[13px] text-ink-soft">
            &ldquo;{typed}
            <span className="animate-pulse">|</span>&rdquo;
          </p>
        </div>
        <div className="h-[340px] rounded-b-xl dotted-grid">
          <FlowCanvas key={active} nodes={flow.nodes} edges={flow.edges} interactive={false} />
        </div>
      </div>
    </section>
  );
}
