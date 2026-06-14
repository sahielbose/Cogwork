import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, signOut } = vi.hoisted(() => ({ push: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/builder", useRouter: () => ({ push }) }));
vi.mock("next-auth/react", () => ({ signOut }));

import { AppShell } from "./app-shell";

beforeEach(() => {
  push.mockClear();
  signOut.mockClear();
});

function renderShell() {
  return render(
    <AppShell user={{ email: "dev@cogwork.test", name: "Dev" }} approvalsCount={3} runMode="fixture">
      <div>content</div>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders nav links with correct routes and marks the active one", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/app");
    const builder = screen.getByRole("link", { name: /Builder/ });
    expect(builder).toHaveAttribute("href", "/builder");
    expect(builder.className).toMatch(/violet/); // active styling
    expect(screen.getByRole("link", { name: /Connections/ })).toHaveAttribute("href", "/connections");
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/settings");
  });

  it("shows the approvals badge count and the run-mode pill", () => {
    renderShell();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/fixture mode/)).toBeInTheDocument();
  });

  it("submits the global search to /app?q=", () => {
    renderShell();
    const input = screen.getByLabelText("Search workflows");
    fireEvent.change(input, { target: { value: "brief" } });
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith("/app?q=brief");
  });

  it("signs out", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
  });
});
