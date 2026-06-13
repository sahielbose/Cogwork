import PgBoss from "pg-boss";
import type { Scheduler } from "./sync";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * pg-boss (Postgres-backed, MIT) adapter for the Scheduler interface. Built and
 * wired now; firing is verified against a real Postgres at the worker entry
 * (the green-gate tests use a fake scheduler so they need no running queue).
 */
export function createScheduler(connectionString: string): Scheduler & { boss: PgBoss } {
  const boss = new PgBoss(connectionString);

  return {
    boss,
    start: async () => {
      await boss.start();
    },
    stop: async () => {
      await boss.stop({ graceful: true });
    },
    ensureQueue: async (name) => {
      try {
        await boss.createQueue(name);
      } catch {
        // queue already exists
      }
    },
    schedule: async (queue, cron, data, opts) => {
      await boss.schedule(queue, cron, data as object, opts?.tz ? { tz: opts.tz } : {});
    },
    unschedule: async (queue) => {
      await boss.unschedule(queue);
    },
    listSchedules: async () => {
      const schedules = (await boss.getSchedules()) as { name: string }[];
      return schedules.map((s) => ({ name: s.name }));
    },
    work: async (queue, handler) => {
      await boss.work(queue, async (jobs: any) => {
        const arr = Array.isArray(jobs) ? jobs : [jobs];
        for (const job of arr) await handler(job.data);
      });
    },
    send: async (queue, data) => {
      await boss.send(queue, data as object);
    },
  };
}
