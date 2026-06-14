import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQ } from "./faq";

describe("FAQ accordion", () => {
  it("opens the first item by default and toggles others", () => {
    render(<FAQ />);
    // first answer visible by default
    expect(screen.getByText(/You describe the workflow instead of wiring nodes/)).toBeInTheDocument();

    // open another question
    const codeQ = screen.getByRole("button", { name: /Do I need to know how to code/ });
    fireEvent.click(codeQ);
    expect(screen.getByText(/Describe what you want in plain words/)).toBeInTheDocument();

    // toggling it closed hides its answer
    fireEvent.click(codeQ);
    expect(screen.queryByText(/Describe what you want in plain words/)).not.toBeInTheDocument();
  });
});
