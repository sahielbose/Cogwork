import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { RunButton } from "./run-button";

beforeEach(() => push.mockClear());

describe("RunButton", () => {
  it("POSTs the run and navigates to the new run", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ runId: "r1", status: "succeeded" }), { status: 200 })),
    );
    render(<RunButton workflowId="wf1" />);
    fireEvent.click(screen.getByRole("button", { name: /Run/ }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/workflows/wf1/run", { method: "POST" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/runs/r1"));
  });

  it("shows a running state while in flight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})), // never resolves
    );
    render(<RunButton workflowId="wf1" />);
    fireEvent.click(screen.getByRole("button", { name: /Run/ }));
    expect(await screen.findByText(/Running…/)).toBeInTheDocument();
  });
});
