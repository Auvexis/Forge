import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectAgentChoice } from "./agent-choice-detector.ts";

describe("agent choice detector", () => {
  it("detects selectable options only when the tool manifest declares selection metadata", () => {
    const choice = detectAgentChoice({
      tool: {
        name: "google_drive_list_files",
        selection: {
          path: "$",
          labelFields: ["name"],
          valueField: "id",
          mode: "single",
        },
      },
      result: [
        { id: "file_1", name: "andresimoes-curriculo.pdf" },
        { id: "file_2", name: "andresimoes-curriculo-estagio.pdf" },
      ],
    });

    assert.deepEqual(choice, {
      status: "waiting-user",
      reason: "ambiguous_result",
      question: "Choose one option to continue.",
      repeatedTool: "google_drive_list_files",
      options: [
        { label: "andresimoes-curriculo.pdf", value: "file_1", item: { id: "file_1", name: "andresimoes-curriculo.pdf" } },
        { label: "andresimoes-curriculo-estagio.pdf", value: "file_2", item: { id: "file_2", name: "andresimoes-curriculo-estagio.pdf" } },
      ],
    });
  });

  it("does not pause on arrays without explicit selection metadata", () => {
    assert.equal(detectAgentChoice({
      tool: { name: "generic_list" },
      result: [{ id: "1" }, { id: "2" }],
    }), null);
  });
});
