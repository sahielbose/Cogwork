import { and, desc, eq } from "drizzle-orm";
import type { Db } from "./client";
import {
  approvals,
  auditLog,
  connections,
  preferences,
  runSteps,
  runs,
  users,
  workflowVersions,
  workflows,
  type Approval,
  type ApprovalStatus,
  type Connection,
  type NewRun,
  type NewRunStep,
  type Preference,
  type Run,
  type RunStatus,
  type RunStep,
  type User,
  type Workflow,
  type WorkflowStatus,
} from "./schema";

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUserByEmail(db: Db, email: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

export async function upsertUserByEmail(
  db: Db,
  email: string,
  fields: { name?: string | null; image?: string | null } = {},
): Promise<User> {
  const existing = await getUserByEmail(db, email);
  if (existing) return existing;
  const rows = await db
    .insert(users)
    .values({ email, name: fields.name ?? null, image: fields.image ?? null })
    .returning();
  return rows[0]!;
}

// ── Preferences (memory) ──────────────────────────────────────────────────────
export async function loadPreferences(db: Db, userId: string): Promise<Preference[]> {
  return db.select().from(preferences).where(eq(preferences.userId, userId));
}

export async function loadPreferencesMap(
  db: Db,
  userId: string,
): Promise<Record<string, unknown>> {
  const rows = await loadPreferences(db, userId);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setPreference(
  db: Db,
  userId: string,
  key: string,
  value: unknown,
): Promise<Preference> {
  const rows = await db
    .insert(preferences)
    .values({ userId, key, value })
    .onConflictDoUpdate({
      target: [preferences.userId, preferences.key],
      set: { value, updatedAt: new Date() },
    })
    .returning();
  return rows[0]!;
}

export async function deletePreference(db: Db, userId: string, key: string): Promise<void> {
  await db
    .delete(preferences)
    .where(and(eq(preferences.userId, userId), eq(preferences.key, key)));
}

// ── Connections ───────────────────────────────────────────────────────────────
export async function listConnections(db: Db, userId: string): Promise<Connection[]> {
  return db.select().from(connections).where(eq(connections.userId, userId));
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export async function listWorkflows(db: Db, userId: string): Promise<Workflow[]> {
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, userId))
    .orderBy(desc(workflows.updatedAt));
}

export async function getWorkflow(db: Db, id: string): Promise<Workflow | undefined> {
  const rows = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
  return rows[0];
}

export async function createWorkflow(
  db: Db,
  input: typeof workflows.$inferInsert,
): Promise<Workflow> {
  const rows = await db.insert(workflows).values(input).returning();
  const wf = rows[0]!;
  await db.insert(workflowVersions).values({
    workflowId: wf.id,
    version: wf.version,
    spec: wf.spec,
    compiledCode: wf.compiledCode ?? null,
    note: "initial",
  });
  return wf;
}

export async function updateWorkflow(
  db: Db,
  id: string,
  patch: Partial<typeof workflows.$inferInsert>,
): Promise<Workflow | undefined> {
  const rows = await db
    .update(workflows)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(workflows.id, id))
    .returning();
  return rows[0];
}

export async function setWorkflowStatus(
  db: Db,
  id: string,
  status: WorkflowStatus,
): Promise<Workflow | undefined> {
  return updateWorkflow(db, id, { status });
}

export async function deleteWorkflow(db: Db, id: string): Promise<void> {
  await db.delete(workflows).where(eq(workflows.id, id));
}

export async function listWorkflowVersions(db: Db, workflowId: string) {
  return db
    .select()
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.version));
}

export async function saveWorkflowVersion(
  db: Db,
  input: typeof workflowVersions.$inferInsert,
) {
  const rows = await db.insert(workflowVersions).values(input).returning();
  return rows[0]!;
}

// ── Runs ──────────────────────────────────────────────────────────────────────
export async function createRun(db: Db, input: NewRun): Promise<Run> {
  const rows = await db.insert(runs).values(input).returning();
  return rows[0]!;
}

export async function getRun(db: Db, runId: string): Promise<Run | undefined> {
  const rows = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  return rows[0];
}

export async function listRuns(db: Db, workflowId: string): Promise<Run[]> {
  return db
    .select()
    .from(runs)
    .where(eq(runs.workflowId, workflowId))
    .orderBy(desc(runs.createdAt));
}

export async function listRecentRuns(db: Db, userId: string, limit = 20) {
  return db
    .select({
      run: runs,
      workflowName: workflows.name,
    })
    .from(runs)
    .innerJoin(workflows, eq(runs.workflowId, workflows.id))
    .where(eq(workflows.userId, userId))
    .orderBy(desc(runs.createdAt))
    .limit(limit);
}

export async function updateRun(
  db: Db,
  runId: string,
  patch: Partial<typeof runs.$inferInsert> & { costUsd?: string | number },
): Promise<Run | undefined> {
  const set: Partial<typeof runs.$inferInsert> = { ...patch };
  if (typeof patch.costUsd === "number") set.costUsd = String(patch.costUsd);
  const rows = await db.update(runs).set(set).where(eq(runs.id, runId)).returning();
  return rows[0];
}

export async function setRunStatus(
  db: Db,
  runId: string,
  status: RunStatus,
  extra: Partial<typeof runs.$inferInsert> = {},
): Promise<Run | undefined> {
  return updateRun(db, runId, { status, ...extra });
}

// ── Run steps ─────────────────────────────────────────────────────────────────
export async function getRunSteps(db: Db, runId: string): Promise<RunStep[]> {
  return db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(runSteps.startedAt);
}

export async function findRunStep(
  db: Db,
  runId: string,
  stepId: string,
  itemIndex: number,
): Promise<RunStep | undefined> {
  const rows = await db
    .select()
    .from(runSteps)
    .where(
      and(
        eq(runSteps.runId, runId),
        eq(runSteps.stepId, stepId),
        eq(runSteps.itemIndex, itemIndex),
      ),
    )
    .limit(1);
  return rows[0];
}

/** Insert-or-update a run step keyed by (runId, stepId, itemIndex). */
export async function upsertRunStep(db: Db, input: NewRunStep): Promise<RunStep> {
  const rows = await db
    .insert(runSteps)
    .values(input)
    .onConflictDoUpdate({
      target: [runSteps.runId, runSteps.stepId, runSteps.itemIndex],
      set: {
        status: input.status,
        input: input.input,
        output: input.output,
        error: input.error,
        attempt: input.attempt,
        tool: input.tool,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
      },
    })
    .returning();
  return rows[0]!;
}

export async function getRunWithSteps(db: Db, runId: string) {
  const run = await getRun(db, runId);
  if (!run) return undefined;
  const steps = await getRunSteps(db, runId);
  const pending = await listRunApprovals(db, runId);
  return { ...run, steps, approvals: pending };
}

// ── Approvals ─────────────────────────────────────────────────────────────────
export async function listRunApprovals(db: Db, runId: string): Promise<Approval[]> {
  return db.select().from(approvals).where(eq(approvals.runId, runId));
}

export async function findApproval(
  db: Db,
  runId: string,
  stepId: string,
  itemIndex: number,
): Promise<Approval | undefined> {
  const rows = await db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.runId, runId),
        eq(approvals.stepId, stepId),
        eq(approvals.itemIndex, itemIndex),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function upsertApproval(
  db: Db,
  input: typeof approvals.$inferInsert,
): Promise<Approval> {
  const rows = await db
    .insert(approvals)
    .values(input)
    .onConflictDoUpdate({
      target: [approvals.runId, approvals.stepId, approvals.itemIndex],
      set: { preview: input.preview, status: input.status ?? "pending" },
    })
    .returning();
  return rows[0]!;
}

export async function getApproval(db: Db, id: string): Promise<Approval | undefined> {
  const rows = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
  return rows[0];
}

export async function resolveApproval(
  db: Db,
  id: string,
  status: Exclude<ApprovalStatus, "pending">,
  resolvedBy: string | null,
): Promise<Approval | undefined> {
  const rows = await db
    .update(approvals)
    .set({ status, resolvedBy, resolvedAt: new Date() })
    .where(eq(approvals.id, id))
    .returning();
  return rows[0];
}

export async function listPendingApprovals(db: Db, userId: string) {
  return db
    .select({
      approval: approvals,
      workflowId: workflows.id,
      workflowName: workflows.name,
      runId: runs.id,
    })
    .from(approvals)
    .innerJoin(runs, eq(approvals.runId, runs.id))
    .innerJoin(workflows, eq(runs.workflowId, workflows.id))
    .where(and(eq(workflows.userId, userId), eq(approvals.status, "pending")))
    .orderBy(desc(approvals.requestedAt));
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export async function writeAudit(
  db: Db,
  entry: typeof auditLog.$inferInsert,
): Promise<void> {
  await db.insert(auditLog).values(entry);
}

export async function listAudit(db: Db, userId: string, limit = 100) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
