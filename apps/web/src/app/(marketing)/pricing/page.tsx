import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GITHUB_URL } from "@/lib/site";

export const metadata = { title: "Pricing — Cogwork" };

const TIERS = [
  {
    name: "Self-host",
    price: "Free forever",
    ribbon: "Open source",
    features: ["Unlimited executions (your infra)", "Unlimited active workflows", "Bring your own keys", "Apache-2.0"],
    cta: { label: "Self-host guide →", href: "/docs" },
    highlight: true,
  },
  {
    name: "Free (hosted)",
    price: "$0",
    features: ["~100 executions / mo", "2 active workflows", "Small included tool credits"],
    cta: { label: "Start free", href: "/login" },
  },
  {
    name: "Pro",
    price: "~$29/mo",
    features: ["~1,000 executions / mo", "10 active workflows", "Included credit pool"],
    cta: { label: "Start free", href: "/login" },
  },
  {
    name: "Team",
    price: "~$99/mo",
    features: ["~10,000 executions / mo", "25 active workflows", "Shared workspace"],
    cta: { label: "Start free", href: "/login" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Custom limits", "SSO, on-prem, SLAs", "Priority support"],
    cta: { label: "Contact sales", href: GITHUB_URL },
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-container px-6 py-20">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold">Simple, honest pricing</h1>
        <p className="mt-3 text-muted">Self-host free forever. Pay only when you want us to run it for you.</p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {TIERS.map((t) => (
          <Card key={t.name} className={t.highlight ? "border-violet p-5" : "p-5"}>
            {t.ribbon && (
              <div className="mb-2 inline-block rounded-full bg-violet-tint px-2 py-0.5 text-[10px] font-semibold text-violet">
                {t.ribbon}
              </div>
            )}
            <div className="font-semibold">{t.name}</div>
            <div className="mt-1 font-display text-2xl font-bold">{t.price}</div>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {t.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Link href={t.cta.href} className="mt-5 block">
              <Button size="sm" variant={t.highlight ? "primary" : "secondary"} className="w-full">
                {t.cta.label}
              </Button>
            </Link>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted">All plans can run fully self-hosted at no cost.</p>

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-center font-display text-2xl font-bold">Pricing FAQ</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              q: "What counts as an execution?",
              a: "One run of a workflow — whether triggered manually, on a schedule, or by webhook. Steps within a run don't count separately.",
            },
            {
              q: "What are tool credits?",
              a: "A pass-through wallet for metered usage like LLM tokens and Apify. Self-host and bring your own keys to avoid them entirely.",
            },
            {
              q: "Can I really self-host for free?",
              a: "Yes — the whole platform is Apache-2.0. Run it on your own infrastructure with no execution or workflow limits.",
            },
          ].map((f) => (
            <div key={f.q} className="rounded-lg border border-line bg-paper p-5">
              <div className="font-semibold text-ink">{f.q}</div>
              <p className="mt-1 text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
