import { Card } from "@/components/ui/card";
import { UseTemplateButton } from "@/components/studio/use-template-button";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-app p-6">
      <h2 className="font-display text-xl font-semibold mb-1">Templates</h2>
      <p className="text-sm text-muted mb-6">Clone a prebuilt workflow into a draft, then refine it.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="text-xs text-violet font-medium">{t.category}</div>
            <div className="mt-1 font-medium text-ink">{t.name}</div>
            <p className="mt-1 flex-1 text-sm text-muted">{t.description}</p>
            <div className="mt-3 mb-4 flex flex-wrap gap-1.5">
              {t.integrations.map((i) => (
                <span key={i} className="rounded-full bg-paper-3 px-2 py-0.5 text-[10px] font-mono text-muted">
                  {i}
                </span>
              ))}
            </div>
            <UseTemplateButton templateId={t.id} />
          </Card>
        ))}
      </div>
    </div>
  );
}
