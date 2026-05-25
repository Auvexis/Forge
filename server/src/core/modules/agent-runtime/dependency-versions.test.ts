import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packageJson from "../../../../package.json" with { type: "json" };

describe("agent runtime dependency policy", () => {
  it("pins LangChain and LangGraph packages through package.json", () => {
    const dependencies = packageJson.dependencies as Record<string, string>;

    assert.ok(dependencies["@langchain/core"]);
    assert.ok(dependencies["@langchain/langgraph"]);
    assert.ok(dependencies["@langchain/openai"]);
    assert.ok(dependencies["@langchain/langgraph-checkpoint-sqlite"]);
    assert.match(dependencies["@langchain/core"], /^\^?\d+\.\d+\.\d+|latest$/);
    assert.match(dependencies["@langchain/langgraph"], /^\^?\d+\.\d+\.\d+|latest$/);
  });
});
