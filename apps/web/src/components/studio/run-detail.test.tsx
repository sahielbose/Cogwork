import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { RunDetail, type RunData } from "./run-detail";

const ts = "2026-06-13T10:00:00.000Z";

function failedRun(): RunData {
  return {
    id: "run-123456",
    status: "failed",
    triggerSource: "manual",
    durationMs: 1200,
    tokenInput: 0,
    tokenOutput: 0,
    costUsd: "0",
    error: "Slack channel not found",
    steps: [
      {
        id: "s1",
        stepId: "fetch",
        itemIndex: 0,
        tool: "gmail.list_messages",
        status: "succeeded",
        input: { query: "is:unread" },
        output: { messages: [] },
        error: null,
        attempt: 1,
        startedAt: ts,
        finishedAt: ts,
      },
    ],
    approvals: [],
  };
}

describe("RunDetail", () => {
  it("shows the failure notice and Retry-from-failed, and POSTs retry", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<RunDetail run={failedRun()} workflow={{ id: "w1", name: "WF" }} />);
    expect(screen.getByText(/Run failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry from failed/ }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/runs/run-123456/retry", { method: "POST" }));
  });

  it("expands a step to reveal redacted input/output", () => {
    render(<RunDetail run={failedRun()} workflow={{ id: "w1", name: "WF" }} />);
    expect(screen.queryByText("Input")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fetch/ }));
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("renders an inline approve for a pending approval", () => {
    const run = failedRun();
    run.status = "awaiting_approval";
    run.error = null;
    run.steps.push({
      id: "s2",
      stepId: "notify",
      itemIndex: 0,
      tool: "slack.post_message",
      status: "pending",
      input: null,
      output: null,
      error: null,
      attempt: 1,
      startedAt: null,
      finishedAt: null,
    });
    run.approvals = [{ id: "a1", stepId: "notify", itemIndex: 0, status: "pending" }];
    render(<RunDetail run={run} workflow={{ id: "w1", name: "WF" }} />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByText(/waiting for your approval/)).toBeInTheDocument();
  });
});
