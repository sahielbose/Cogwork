import { createRun, getWorkflow, listScheduledWorkflows, type Db } from "@cogwork/db";
import { executeRun, type RunResult } from "@cogwork/engine";
import { RUN_QUEUE, queueNameFor, syncSchedules, type Scheduler } from "./sync";

/**
 * Execute a workflow as a job (cron fire / webhook / async manual). Creates a
 * run and runs it deterministically. Paused/draft workflows are skipped on a
 * scheduled fire.
 */
export async function runWorkflowJob(
  db: Db,
  workflowId: string,
  triggerSource: "schedule" | "webhook" | "manual" | "api",
  trigger?: Record<string, unknown>,
): Promise<{ runId: string; result: RunResult } | { skipped: true }> {
  const wf = await getWorkflow(db, workflowId);
  if (!wf) throw new Error(`Workflow ${workflowId} not found`);
  if (triggerSource === "schedule" && wf.status !== "active") return { skipped: true };

  const run = await createRun(db, {
    workflowId,
    workflowVersion: wf.version,
    triggerSource,
    status: "queued",
  });
  const result = await executeRun({ runId: run.id, spec: wf.spec, db, trigger });
  return { runId: run.id, result };
}

interface JobData {
  workflowId: string;
  triggerSource?: "schedule" | "webhook" | "manual" | "api";
  trigger?: Record<string, unknown>;
}

function asJobData(data: unknown): JobData | null {
  if (data && typeof data === "object" && "workflowId" in data) {
    return data as JobData;
  }
  return null;
}

/**
 * Wire a scheduler: a shared RUN_QUEUE worker for ad-hoc runs, plus a
 * per-workflow cron schedule + worker for each active scheduled workflow.
 * Re-syncs schedules from the DB on an interval to pick up changes.
 */
export async function startWorker(
  db: Db,
  scheduler: Scheduler,
  opts: { resyncMs?: number } = {},
): Promise<{ stop: () => Promise<void> }> {
  await scheduler.start();
  await scheduler.ensureQueue(RUN_QUEUE);
  await scheduler.work(RUN_QUEUE, async (data) => {
    const job = asJobData(data);
    if (job) await runWorkflowJob(db, job.workflowId, job.triggerSource ?? "api", job.trigger);
  });

  const workedQueues = new Set<string>();
  const sync = async () => {
    const workflows = await listScheduledWorkflows(db);
    await syncSchedules(scheduler, workflows);
    for (const w of workflows) {
      const q = queueNameFor(w.id);
      if (!workedQueues.has(q)) {
        workedQueues.add(q);
        await scheduler.work(q, async (data) => {
          const job = asJobData(data);
          if (job) await runWorkflowJob(db, job.workflowId, "schedule", job.trigger);
        });
      }
    }
  };
  await sync();
  const timer = setInterval(() => void sync(), opts.resyncMs ?? 60_000);

  return {
    stop: async () => {
      clearInterval(timer);
      await scheduler.stop();
    },
  };
}

export async function enqueueRun(
  scheduler: Scheduler,
  workflowId: string,
  triggerSource: JobData["triggerSource"] = "api",
  trigger?: Record<string, unknown>,
): Promise<void> {
  await scheduler.send(RUN_QUEUE, { workflowId, triggerSource, trigger });
}
