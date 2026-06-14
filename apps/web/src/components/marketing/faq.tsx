"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How is Cogwork different from Zapier or n8n?",
    a: "You describe the workflow instead of wiring nodes. Cogwork compiles your words into a typed, readable spec, runs it deterministically, and traces every step. And it's open source — read it, run it, own it.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. Describe what you want in plain words. If you do code, there's a spec and code view, plus one-click TypeScript export.",
  },
  {
    q: "Is it really open source? Can I self-host?",
    a: "Yes — Apache-2.0. Run the whole thing on your own infrastructure with bring-your-own keys.",
  },
  {
    q: "How do my credentials stay safe?",
    a: "Tokens are encrypted at rest, workflows use least-privilege OAuth, and secrets are never sent to the model and are redacted from logs.",
  },
  {
    q: "What if an integration is missing?",
    a: "Connectors are modular. Request one, or add your own — it's open source, so nothing's locked behind us.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <div className="eyebrow text-center">Got questions?</div>
      <h2 className="mt-3 text-center font-display text-4xl font-bold">
        Frequently asked <span className="italic text-violet">questions</span>
      </h2>
      <div className="mt-10 space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="rounded-lg border border-line bg-paper">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-semibold text-ink">{f.q}</span>
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                    isOpen ? "bg-violet text-white" : "bg-paper-3 text-ink-soft",
                  )}
                >
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              {isOpen && <p className="px-5 pb-5 text-muted">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
