import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/flow/canvas", () => ({ FlowCanvas: () => <div data-testid="canvas" /> }));

import { Hero } from "./hero";

beforeEach(() => {
  // reduced-motion → the typed prompt shows in full immediately
  window.matchMedia = ((q: string) => ({
    matches: true,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("Hero", () => {
  it("defaults to Daily briefings and shows its prompt + Try-this-workflow", () => {
    render(<Hero />);
    expect(screen.getByText(/Each weekday at 8am/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try this workflow/ })).toHaveAttribute("href", "/login");
  });

  it("switches the demo tab and updates the prompt", () => {
    render(<Hero />);
    fireEvent.click(screen.getByRole("button", { name: "Candidate sourcing" }));
    expect(screen.getByText(/Find engineers matching our hiring bar/)).toBeInTheDocument();
  });
});
