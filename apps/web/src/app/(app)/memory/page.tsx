import { loadPreferences } from "@cogwork/db";
import { MemoryEditor } from "@/components/studio/memory-editor";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const user = await currentUser();
  const prefs = await loadPreferences(getDb(), user!.id);
  return (
    <div className="mx-auto max-w-app p-6">
      <h2 className="font-display text-xl font-semibold mb-4">Memory</h2>
      <MemoryEditor
        initial={prefs.map((p) => ({ key: p.key, value: p.value, updatedAt: p.updatedAt }))}
      />
    </div>
  );
}
