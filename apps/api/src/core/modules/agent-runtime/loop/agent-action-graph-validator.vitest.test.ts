import { describe, expect, it } from "vitest";
import { validateAgentActionGraph } from "./agent-action-graph-validator.ts";

describe("validateAgentActionGraph", () => {
  it("accepts a valid dependency graph", () => {
    expect(() => validateAgentActionGraph([
      action("download"),
      action("email", ["download"]),
      action("youtube", ["download"]),
    ], 3)).not.toThrow();
  });

  it("rejects cycles and missing dependencies", () => {
    expect(() => validateAgentActionGraph([
      action("one", ["two"]),
      action("two", ["one"]),
    ], 2)).toThrow(/cycle/);
    expect(() => validateAgentActionGraph([
      action("email", ["download"]),
    ], 2)).toThrow(/unknown action/);
  });

  it("rejects action plans larger than the tool-call limit", () => {
    expect(() => validateAgentActionGraph([
      action("one"),
      action("two"),
    ], 1)).toThrow(/exceeds tool-call limit/);
  });
});

function action(id: string, dependsOn: string[] = []) {
  return {
    id,
    toolName: `${id}_tool`,
    objective: id,
    dependsOn,
  };
}
