import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { UseTemplateButton } from "./use-template-button";

beforeEach(() => push.mockClear());

describe("UseTemplateButton", () => {
  it("clones the template and opens the new draft in the builder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ workflowId: "wf9" }), { status: 201 })),
    );
    render(<UseTemplateButton templateId="daily-briefing" />);
    fireEvent.click(screen.getByRole("button", { name: /Use template/ }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/templates/daily-briefing/clone", { method: "POST" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/builder?id=wf9"));
  });
});
