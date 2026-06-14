"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function Terminal({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const copyable = lines.filter((l) => l.startsWith("$")).map((l) => l.slice(2)).join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyable);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#0b0c10]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green/70" />
        </div>
        <button onClick={copy} className="text-white/50 hover:text-white" aria-label="Copy commands">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-auto p-4 font-mono text-[13px] leading-6">
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith("#") ? "text-white/40" : "text-paper"}>
            {l.startsWith("$") ? (
              <>
                <span className="text-violet">$</span>
                <span>{l.slice(1)}</span>
              </>
            ) : (
              l
            )}
          </div>
        ))}
      </pre>
    </div>
  );
}
