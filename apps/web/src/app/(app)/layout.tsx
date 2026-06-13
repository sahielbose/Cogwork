import { listPendingApprovals } from "@cogwork/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/studio/app-shell";
import { currentUser } from "@/lib/auth";
import { COGWORK_RUN_MODE, getDb } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  let approvalsCount = 0;
  try {
    approvalsCount = (await listPendingApprovals(getDb(), user.id)).length;
  } catch {
    // DB may be unavailable during early dev; show 0 rather than crash the shell.
  }

  return (
    <AppShell user={user} approvalsCount={approvalsCount} runMode={COGWORK_RUN_MODE}>
      {children}
    </AppShell>
  );
}
