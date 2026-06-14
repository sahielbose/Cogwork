import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

import { MemoryEditor } from "./memory-editor";

beforeEach(() => refresh.mockClear());

describe("MemoryEditor", () => {
  it("shows the empty state when there are no preferences", () => {
    render(<MemoryEditor initial={[]} />);
    expect(screen.getByText(/Nothing remembered yet/)).toBeInTheDocument();
  });

  it("adds a preference via PUT and refreshes", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ preference: {} }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(<MemoryEditor initial={[]} />);
    fireEvent.change(screen.getByPlaceholderText(/^key/), { target: { value: "tone" } });
    fireEvent.change(screen.getByPlaceholderText(/^value/), { target: { value: "concise" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(f).toHaveBeenCalledWith(
        "/api/preferences/tone",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("renders existing preferences and deletes one", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    render(
      <MemoryEditor initial={[{ key: "tone", value: "warm", updatedAt: new Date().toISOString() }]} />,
    );
    expect(screen.getByDisplayValue("warm")).toBeInTheDocument();
    // the delete (trash) button is the icon-only button in the row
    const buttons = screen.getAllByRole("button");
    const del = buttons.find((b) => b.querySelector("svg") && b.textContent === "");
    fireEvent.click(del!);
    await waitFor(() =>
      expect(f).toHaveBeenCalledWith("/api/preferences/tone", { method: "DELETE" }),
    );
  });
});
