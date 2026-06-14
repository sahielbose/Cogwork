import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntegrationsDirectory } from "./integrations-directory";

const connectors = [
  { provider: "slack", authType: "oauth2", actions: [{ name: "slack.post_message", description: "x", sideEffect: true }] },
  { provider: "github", authType: "oauth2", actions: [{ name: "github.create_issue", description: "x", sideEffect: true }] },
  { provider: "postgres", authType: "api_key", actions: [{ name: "postgres.query", description: "x", sideEffect: false }] },
];

describe("IntegrationsDirectory", () => {
  it("lists connectors with links to detail pages", () => {
    render(<IntegrationsDirectory connectors={connectors} />);
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Slack/ })).toHaveAttribute("href", "/integrations/slack");
  });

  it("filters by search term", () => {
    render(<IntegrationsDirectory connectors={connectors} />);
    fireEvent.change(screen.getByLabelText("Search integrations"), { target: { value: "slack" } });
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("filters by category chip", () => {
    render(<IntegrationsDirectory connectors={connectors} />);
    fireEvent.click(screen.getByRole("button", { name: "Data" })); // postgres
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.queryByText("Slack")).not.toBeInTheDocument();
  });
});
