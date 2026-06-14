import { describe, expect, it } from "vitest";
import { getToolCatalog } from "@cogwork/connectors";
import { validateSpec } from "@cogwork/spec";
import { TEMPLATES } from "./templates";

describe("starter templates", () => {
  const catalog = getToolCatalog();
  it("ships 5 templates", () => {
    expect(TEMPLATES).toHaveLength(5);
  });
  for (const t of TEMPLATES) {
    it(`"${t.id}" is a semantically valid spec`, () => {
      const result = validateSpec(t.spec, catalog);
      expect(result.ok, result.errors.join("; ")).toBe(true);
    });
  }
});
