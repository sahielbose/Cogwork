import { Terminal } from "@/components/marketing/terminal";

export const metadata = { title: "Docs — Cogwork" };

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "concepts", label: "Core concepts" },
  { id: "self-hosting", label: "Self-hosting" },
  { id: "writing", label: "Writing workflows" },
];

export default function DocsPage() {
  return (
    <div className="mx-auto grid max-w-container gap-10 px-6 py-16 md:grid-cols-[200px_1fr]">
      <aside className="hidden md:block">
        <nav className="sticky top-24 space-y-1">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-3">
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-[720px] space-y-10">
        <section id="quickstart">
          <h1 className="font-display text-3xl font-bold">Quickstart</h1>
          <p className="mt-3 text-muted">Run Cogwork locally with Postgres and your Anthropic key.</p>
          <div className="mt-4">
            <Terminal
              lines={[
                "$ git clone https://github.com/sahielbose/Cogwork",
                "$ cd Cogwork && pnpm install",
                "$ cp .env.example .env   # add ANTHROPIC_API_KEY",
                "$ docker compose up -d && pnpm db:push",
                "$ pnpm dev   # http://localhost:3000",
              ]}
            />
          </div>
        </section>

        <section id="concepts">
          <h2 className="font-display text-2xl font-semibold">Core concepts</h2>
          <ul className="mt-3 space-y-2 text-muted">
            <li><strong className="text-ink">Workflow</strong> — a saved automation with a current spec, status, and trigger.</li>
            <li><strong className="text-ink">Spec</strong> — the typed, Zod-validated description that is stored, versioned, and executed.</li>
            <li><strong className="text-ink">Connector</strong> — an integration exposing typed actions; side-effecting actions are approval-gated.</li>
            <li><strong className="text-ink">Trigger</strong> — manual, webhook, or schedule (cron + timezone).</li>
            <li><strong className="text-ink">Run</strong> — one execution, with a step-by-step trace (redacted I/O, retries, tokens, cost).</li>
            <li><strong className="text-ink">Approval</strong> — a pause on a side-effect; resolve it and the run resumes from DB state.</li>
          </ul>
        </section>

        <section id="self-hosting">
          <h2 className="font-display text-2xl font-semibold">Self-hosting</h2>
          <p className="mt-3 text-muted">
            Cogwork is Apache-2.0 and self-hostable. It needs Postgres and an Anthropic key; connectors
            run in <code className="font-mono text-sm">fixture</code> mode until you add OAuth apps and flip{" "}
            <code className="font-mono text-sm">COGWORK_CONNECTORS=live</code>. Run the scheduler with{" "}
            <code className="font-mono text-sm">pnpm worker</code>.
          </p>
        </section>

        <section id="writing">
          <h2 className="font-display text-2xl font-semibold">Writing workflows</h2>
          <p className="mt-3 text-muted">
            Describe what you want in the Builder. Cogwork compiles it into a spec, validates every
            tool and binding, and shows you a plain-English summary and a visual flow. Refine by
            chatting; export the TypeScript whenever you want it.
          </p>
        </section>
      </article>
    </div>
  );
}
