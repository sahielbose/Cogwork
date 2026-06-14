export const metadata = { title: "Terms — Cogwork" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-16">
      <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-subtle">Placeholder copy — to be replaced by counsel.</p>
      <div className="mt-6 space-y-4 text-muted">
        <p>
          Cogwork is open-source software provided under the MIT License. When you self-host
          Cogwork, you are responsible for the infrastructure it runs on and the credentials you
          connect to it.
        </p>
        <p>
          The software is provided &ldquo;as is&rdquo;, without warranty of any kind. See the LICENSE
          file in the repository for the full terms that govern your use of the code.
        </p>
        <p>
          Cogwork is free and open source. This page is a placeholder and does not constitute the
          final agreement.
        </p>
      </div>
    </article>
  );
}
