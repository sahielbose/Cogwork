import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { StatusToggle } from "./status-toggle";

beforeEach(() => refresh.mockClear());

describe("StatusToggle", () => {
  it("pauses an active workflow", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<StatusToggle id="w1" status="active" />);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() => expect(f).toHaveBeenCalledWith("/api/workflows/w1/pause", { method: "POST" }));
  });

  it("activates a paused workflow", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<StatusToggle id="w1" status="paused" />);
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    await waitFor(() =>
      expect(f).toHaveBeenCalledWith("/api/workflows/w1/activate", { method: "POST" }),
    );
  });
});
