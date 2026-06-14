import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { ApprovalActions } from "./approval-actions";

beforeEach(() => refresh.mockClear());

describe("ApprovalActions", () => {
  it("approves via the API and refreshes", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ runId: "r1" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<ApprovalActions approvalId="a1" runId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/approvals/a1/approve", { method: "POST" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("rejects via the API", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<ApprovalActions approvalId="a1" runId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/approvals/a1/reject", { method: "POST" }));
  });

  it("links to the run", () => {
    render(<ApprovalActions approvalId="a1" runId="r1" />);
    expect(screen.getByRole("link", { name: /View run/ })).toHaveAttribute("href", "/runs/r1");
  });
});
