import type { Workflow } from "@cogwork/db";

/**
 * Scheduling sync logic (pure — fully unit-tested without pg-boss). Decides
 * which workflows should have an active cron schedule and what each entry is.
 */

export const RUN_QUEUE = "cogwork.run";

export function queueNameFor(workflowId: string): string {
  return `cogwork.wf.${workflowId}`;
}

export interface SchedulePlan {
  workflowId: string;
  queue: string;
  cron: string;
  timezone: string;
}

/** Only `active` + `schedule`-triggered workflows with a cron get scheduled. */
export function desiredSchedules(workflows: Workflow[]): SchedulePlan[] {
  return workflows
    .filter((w) => w.status === "active" && w.triggerType === "schedule" && !!w.scheduleCron)
    .map((w) => ({
      workflowId: w.id,
      queue: queueNameFor(w.id),
      cron: w.scheduleCron!,
      timezone: w.timezone ?? "UTC",
    }));
}

/** Minimal scheduler surface the sync + worker rely on (pg-boss implements it). */
export interface Scheduler {
  start(): Promise<void>;
  stop(): Promise<void>;
  ensureQueue(name: string): Promise<void>;
  schedule(queue: string, cron: string, data: unknown, opts?: { tz?: string }): Promise<void>;
  unschedule(queue: string): Promise<void>;
  listSchedules(): Promise<{ name: string }[]>;
  work(queue: string, handler: (data: unknown) => Promise<void>): Promise<void>;
  send(queue: string, data: unknown): Promise<void>;
}

export interface SyncResult {
  scheduled: string[];
  unscheduled: string[];
}

/**
 * Reconcile pg-boss schedules to the desired set: schedule active workflows,
 * remove schedules for workflows that are no longer active/scheduled.
 */
export async function syncSchedules(
  scheduler: Scheduler,
  workflows: Workflow[],
): Promise<SyncResult> {
  const desired = desiredSchedules(workflows);
  const desiredQueues = new Set(desired.map((d) => d.queue));

  const existing = await scheduler.listSchedules();
  const existingCogwork = existing.filter((s) => s.name.startsWith("cogwork.wf."));

  const scheduled: string[] = [];
  for (const plan of desired) {
    await scheduler.ensureQueue(plan.queue);
    await scheduler.schedule(plan.queue, plan.cron, { workflowId: plan.workflowId }, { tz: plan.timezone });
    scheduled.push(plan.queue);
  }

  const unscheduled: string[] = [];
  for (const s of existingCogwork) {
    if (!desiredQueues.has(s.name)) {
      await scheduler.unschedule(s.name);
      unscheduled.push(s.name);
    }
  }

  return { scheduled, unscheduled };
}
