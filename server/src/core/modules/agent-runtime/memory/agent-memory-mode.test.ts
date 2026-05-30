import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiMemoryNodeConfig } from "../agent-types.ts";
import {
  resolveAgentMemoryMode,
  usesLongTermMemory,
  usesShortTermMemory,
} from "./agent-memory-mode.ts";

describe("agent memory mode", () => {
  it("is stateless without a connected memory node", () => {
    assert.equal(resolveAgentMemoryMode(undefined), "stateless");
    assert.equal(usesShortTermMemory(undefined), false);
    assert.equal(usesLongTermMemory(undefined), false);
  });

  it("treats explicit and legacy Sailor internal memory as SQLite short-term memory", () => {
    assert.equal(resolveAgentMemoryMode(memoryConfig({ adapter: "sailor-internal" })), "short-term");
    assert.equal(resolveAgentMemoryMode(memoryConfig({ adapter: undefined })), "short-term");
    assert.equal(usesShortTermMemory(memoryConfig()), true);
  });

  it("treats plugin memory stores as long-term memory", () => {
    const memory = memoryConfig({
      adapter: "plugin-memory-store",
      pluginId: "sailor-postgresql",
      searchMethodId: "searchAgentMemory",
      putMethodId: "putAgentMemory",
    });

    assert.equal(resolveAgentMemoryMode(memory), "long-term");
    assert.equal(usesShortTermMemory(memory), false);
    assert.equal(usesLongTermMemory(memory), true);
  });
});

function memoryConfig(overrides: Partial<AiMemoryNodeConfig> = {}): AiMemoryNodeConfig {
  return {
    type: "ai-memory",
    name: "Memory",
    scope: "session",
    readEnabled: true,
    writeEnabled: false,
    maxRetrievedMemories: 4,
    maxMemoryChars: 4000,
    ...overrides,
  };
}
