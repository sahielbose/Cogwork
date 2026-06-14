import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { WorkflowSpec } from "@cogwork/spec";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/flow/canvas", () => ({ FlowCanvas: () => <div data-testid="canvas" /> }));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { WorkflowDetail, type WorkflowDetailData } from "./workflow-detail";

const spec: WorkflowSpec = {
  version: 1,
  name: "WF",
  trigger: { type: "schedule", cron: "0 8 * * 1-5", timezone: "UTC" },
  steps: [{ id: "notify", tool: "slack.post_message", params: { channel: "@me", text: "hi" }, approval: "required" }],
};
const wf: WorkflowDetailData = {
  id: "w1",
  name: "WF",
  status: "active",
  triggerType: "schedule",
  scheduleCron: "0 8 * * 1-5",
  version: 2,
  spec,
};

beforeEach(() => refresh.mockClear());

function renderDetail() {
  return render(
    <WorkflowDetail
      workflow={wf}
      summary={"WF\n\nRuns every weekday."}
      sideEffectSteps={[{ id: "notify", tool: "slack.post_message", approval: "required" }]}
      versions={[
        { version: 2, note: "current", createdAt: "2026-06-13T10:00:00Z", spec },
        { version: 1, note: "initial", createdAt: "2026-06-12T10:00:00Z", spec },
      ]}
      runs={[]}
    />,
  );
}

describe("WorkflowDetail", () => {
  it("shows the trigger chip and schedule in Overview", () => {
    renderDetail();
    expect(screen.getByText(/Schedule · 0 8 \* \* 1-5/)).toBeInTheDocument();
    expect(screen.getByText(/Runs on cron/)).toBeInTheDocument();
  });

  it("switches to Versions and offers rollback for non-current versions", () => {
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Versions" }));
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roll back" })).toBeInTheDocument();
  });

  it("toggles a side-effect step's approval in the whitelist (PATCH)", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "auto" }));
    await waitFor(() =>
      expect(f).toHaveBeenCalledWith(
        "/api/workflows/w1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });
});
