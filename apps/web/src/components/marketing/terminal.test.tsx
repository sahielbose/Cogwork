import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Terminal } from "./terminal";

describe("Terminal", () => {
  it("renders lines and copies only the $ commands", async () => {
    const spy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<Terminal lines={["$ git clone repo", "$ cd repo && pnpm dev", "# studio ready"]} />);
    expect(screen.getByText(/git clone repo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("git clone repo\ncd repo && pnpm dev"));
  });
});
