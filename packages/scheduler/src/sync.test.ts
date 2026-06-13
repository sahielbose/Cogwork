import { describe, expect, it } from "vitest";
import type { Workflow } from "@cogwork/db";
import { desiredSchedules, queueNameFor, syncSchedules, type Scheduler } from "./sync";

function wf(partial: Partial<Workflow>): Workflow {
  return {
    id: "w1",
    userId: "u1",
    name: "WF",
    description: null,
    spec: { version: 1, name: "WF", trigger: { type: "manual" }, steps: [] } as never,
    compiledCode: null,
    status: "active",
    triggerType: "schedule",
    scheduleCron: "0 8 * * 1-5",
    timezone: "America/Los_Angeles",
    webhookPath: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

class FakeScheduler implements Scheduler {
  schedules = new Map<string, { cron: string; tz?: string }>();
  queues = new Set<string>();
  async start() {}
  async stop() {}
  async ensureQueue(name: string) {
    this.queues.add(name);
  }
  async schedule(queue: string, cron: string, _data: unknown, opts?: { tz?: string }) {
    this.schedules.set(queue, { cron, tz: opts?.tz });
  }
  async unschedule(queue: string) {
    this.schedules.delete(queue);
  }
  async listSchedules() {
    return [...this.schedules.keys()].map((name) => ({ name }));
  }
  async work() {}
  async send() {}
}

describe("desiredSchedules", () => {
  it("includes only active, schedule-triggered workflows with a cron", () => {
    const plans = desiredSchedules([
      wf({ id: "a" }),
      wf({ id: "b", status: "paused" }),
      wf({ id: "c", triggerType: "manual", scheduleCron: null }),
      wf({ id: "d", triggerType: "schedule", scheduleCron: null }),
    ]);
    expect(plans.map((p) => p.workflowId)).toEqual(["a"]);
    expect(plans[0]!.queue).toBe(queueNameFor("a"));
    expect(plans[0]!.cron).toBe("0 8 * * 1-5");
    expect(plans[0]!.timezone).toBe("America/Los_Angeles");
  });
});

describe("syncSchedules", () => {
  it("schedules active workflows", async () => {
    const s = new FakeScheduler();
    const res = await syncSchedules(s, [wf({ id: "a" }), wf({ id: "b", status: "paused" })]);
    expect(res.scheduled).toEqual([queueNameFor("a")]);
    expect(s.schedules.has(queueNameFor("a"))).toBe(true);
    expect(s.queues.has(queueNameFor("a"))).toBe(true);
  });

  it("removes a schedule when a workflow is no longer active", async () => {
    const s = new FakeScheduler();
    // pre-seed an existing schedule for workflow "a"
    await s.schedule(queueNameFor("a"), "0 8 * * 1-5", {});
    // now "a" is paused → should be unscheduled
    const res = await syncSchedules(s, [wf({ id: "a", status: "paused" })]);
    expect(res.unscheduled).toEqual([queueNameFor("a")]);
    expect(s.schedules.has(queueNameFor("a"))).toBe(false);
  });
});
