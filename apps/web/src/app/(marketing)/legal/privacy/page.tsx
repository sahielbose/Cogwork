export const metadata = { title: "Privacy — Cogwork" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-16">
      <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-subtle">Placeholder copy — to be replaced by counsel.</p>
      <div className="mt-6 space-y-4 text-muted">
        <p>
          When you self-host Cogwork, your data — connections, workflows, runs, and secrets — stays in
          your own Postgres database. OAuth tokens are encrypted at rest with AES-256-GCM.
        </p>
        <p>
          Secrets are never sent to the language model. The Builder sees the connector catalog and
          your preferences; runtime secrets are resolved server-side and redacted from logs and run
          traces.
        </p>
        <p>
          The only external service the core depends on is the LLM provider you configure (Anthropic
          by default), called with your own API key. This page is a placeholder.
        </p>
      </div>
    </article>
  );
}
