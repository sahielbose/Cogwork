import { getWorkflow } from "@cogwork/db";
import { BuilderStudio } from "@/components/studio/builder-studio";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) return <BuilderStudio />;

  const user = await currentUser();
  const wf = await getWorkflow(getDb(), id);
  if (!wf || wf.userId !== user!.id) return <BuilderStudio />;

  return (
    <BuilderStudio initialSpec={wf.spec} initialWorkflowId={wf.id} initialName={wf.name} />
  );
}
