import {
  Calendar,
  Database,
  FileText,
  Github,
  Globe,
  Lock,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CogMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { formatCount, getGithubStats, GITHUB_URL, OSS_SIGNALS } from "@/lib/site";
import { Terminal } from "./terminal";

export function HowItWorks() {
  const steps = [
    { n: "01", t: "Describe", d: "Write what you want like you'd tell a teammate." },
    { n: "02", t: "Review", d: "See the workflow in plain English and a visual flow. Change anything by chatting." },
    { n: "03", t: "Run", d: "Trigger it by hand, on a schedule, or by webhook — and watch every step." },
  ];
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="eyebrow text-center">How it works</div>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n}>
            <div className="font-mono text-sm text-violet">{s.n}</div>
            <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
            <p className="mt-2 text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Honest community-proof signals: real GitHub counts when available, else tags. */
export async function CommunityProof() {
  const stats = await getGithubStats();
  return (
    <section className="border-y border-line bg-paper-2">
      <div className="mx-auto max-w-container px-6 py-10">
        <div className="eyebrow text-center">Open source, out in the open</div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-soft">
          {stats.live && stats.stars !== null ? (
            <>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet" /> ★ {formatCount(stats.stars)} on GitHub
              </span>
              {stats.forks !== null && (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet" /> {formatCount(stats.forks)} forks
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet" /> MIT
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet" /> Self-hostable
              </span>
            </>
          ) : (
            OSS_SIGNALS.map((s) => (
              <span key={s} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet" /> {s}
              </span>
            ))
          )}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-violet hover:underline">
            <Github size={15} /> View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

const ORBIT: LucideIcon[] = [Mail, Calendar, MessageSquare, FileText, Github, Database, Globe, Search];

export function WhyCogwork() {
  return (
    <section className="mx-auto max-w-container px-6 py-24">
      <div className="text-center">
        <h2 className="font-display text-4xl font-bold">Why Cogwork</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Not another node-dragging tool. Production workflows from a sentence — that you can read,
          run anywhere, and own.
        </p>
      </div>

      <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="eyebrow">Encrypted connections</div>
          <h3 className="mt-3 font-display text-2xl font-semibold">
            Plug in your whole stack. Encrypted by default.
          </h3>
          <p className="mt-3 text-muted">
            Gmail, Slack, Notion, GitHub, Postgres and more. Tokens are encrypted at rest, every
            workflow runs with least-privilege access, and you can store multiple credentials per app.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
              <Lock size={13} /> AES-256 at rest
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs">
              <ShieldCheck size={13} /> Least-privilege OAuth
            </span>
            <Link href="/integrations" className="inline-flex items-center rounded-full px-3 py-1 text-xs text-violet hover:underline">
              Explore integrations →
            </Link>
          </div>
        </div>

        <div className="relative mx-auto grid h-80 w-80 place-items-center rounded-full bg-violet-tint">
          <CogMark size={56} className="text-violet" />
          {ORBIT.map((Icon, i) => {
            const angle = (i / ORBIT.length) * 2 * Math.PI;
            const r = 130;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <span
                key={i}
                className="absolute grid h-11 w-11 place-items-center rounded-full border border-line bg-paper shadow-sm"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <Icon size={18} className="text-ink-soft" />
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ConversationalBuilder() {
  return (
    <section className="mx-auto max-w-container px-6 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-5 shadow-md">
          <div className="mb-4 inline-flex rounded-full bg-paper-3 px-2 py-0.5 text-[11px] font-medium text-muted">
            Workflow Builder · v1
          </div>
          <div className="space-y-3">
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-paper-3 px-3 py-2 text-sm">
              Logged 47 candidates to your sheet.
            </div>
            <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-ink px-3 py-2 text-sm text-white">
              Draft outreach for each.
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-paper-3 px-3 py-2 text-sm">
              Done — drafts are in your Gmail.
            </div>
            <div className="flex gap-1 px-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-subtle" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-subtle" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-subtle" />
            </div>
          </div>
          <p className="mt-3 text-xs text-subtle">Refine by chatting.</p>
        </div>
        <div>
          <div className="eyebrow">AI-native builder</div>
          <h2 className="mt-3 font-display text-3xl font-bold">Build by talking. Refine by talking.</h2>
          <p className="mt-3 text-muted">
            No nodes to wire, no config screens. Describe a change and the workflow updates — with
            line-by-line traceability whenever you want it.
          </p>
        </div>
      </div>
    </section>
  );
}

export async function OpenSource() {
  const stats = await getGithubStats();
  return (
    <section className="relative overflow-hidden bg-ink py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet/30 blur-3xl" />
      <div className="relative mx-auto grid max-w-container gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="eyebrow text-white/60">Open source</div>
          <h2 className="mt-3 font-display text-4xl font-bold text-paper">
            Built in the open.{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent">
              Run it yourself.
            </span>
          </h2>
          <p className="mt-4 max-w-lg text-white/70">
            Cogwork&apos;s engine, connectors, and studio are MIT. Read every line, self-host
            it, fork it, extend it — no lock-in, no black boxes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Button size="lg">
                <Github size={18} /> View on GitHub →
              </Button>
            </a>
            <Link href="/docs">
              <Button size="lg" variant="secondary" className="border-white/20 bg-transparent text-paper hover:bg-white/10">
                Read the self-host guide →
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/50">
            <span>MIT</span>
            <span>·</span>
            <span>self-hostable</span>
            <span>·</span>
            <span>bring your own keys</span>
            <span>·</span>
            <a href="/llms.txt" className="hover:text-white">For AI agents (llms.txt) →</a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-paper p-5 shadow-lg">
            <div className="flex items-center gap-2">
              <Github size={18} />
              <span className="font-mono text-sm">sahielbose/cogwork</span>
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-muted">
                MIT
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Open-source, AI-native workflow automation.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs text-muted">
              {stats.live && stats.stars !== null && <span>★ {formatCount(stats.stars)}</span>}
              {stats.live && stats.forks !== null && <span>⑂ {formatCount(stats.forks)}</span>}
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet" /> TypeScript
              </span>
              <span>self-hostable</span>
              <span>MIT</span>
            </div>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="mt-4 inline-block">
              <Button size="sm">View on GitHub →</Button>
            </a>
          </div>
          <Terminal
            lines={[
              "$ git clone https://github.com/sahielbose/Cogwork",
              "$ cd Cogwork && pnpm install",
              "$ docker compose up -d && pnpm dev",
              "# studio → localhost:3000",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

export async function FinalCTA() {
  const stats = await getGithubStats();
  const signals =
    stats.live && stats.stars !== null
      ? [
          `★ ${formatCount(stats.stars)} on GitHub`,
          ...(stats.forks !== null ? [`${formatCount(stats.forks)} forks`] : []),
          "MIT",
          "Self-hostable",
        ]
      : OSS_SIGNALS;
  return (
    <section className="mx-auto max-w-container px-6 py-24 text-center">
      <h2 className="font-display text-4xl font-bold md:text-5xl">
        Ship your first <span className="text-violet">workflow</span> today.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-muted">
        Describe it, review it, let it run — free and open source forever.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/login">
          <Button size="lg">Start free →</Button>
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          <Button size="lg" variant="secondary">
            <Github size={18} /> View on GitHub
          </Button>
        </a>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
        {signals.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </section>
  );
}
