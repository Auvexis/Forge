import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { AiMemoryNodeConfig } from "../agent-types.ts";
import {
  assertMemoryWriteAllowed,
  buildMemoryNamespace,
} from "./agent-memory-policy.ts";

describe("agent memory policy", () => {
  it("treats session memory as readable conversation state without long-term writes", () => {
    const namespace = buildMemoryNamespace({
      scope: "session",
      profileId: "profile_1",
      workflowId: "workflow_1",
    });

    assert.equal(namespace, null);
    assert.throws(
      () =>
        assertMemoryWriteAllowed({
          memory: memoryConfig({ scope: "session", writeEnabled: true }),
          value: "remember this",
          namespace,
        }),
      /long-term memory/i,
    );
  });

  it("builds workflow memory namespaces from profile and workflow ids", () => {
    assert.equal(
      buildMemoryNamespace({
        scope: "workflow",
        profileId: "profile_1",
        workflowId: "workflow_1",
      }),
      "workflow:profile_1:workflow_1",
    );
  });

  it("builds profile memory namespaces from profile id", () => {
    assert.equal(
      buildMemoryNamespace({ scope: "profile", profileId: "profile_1" }),
      "profile:profile_1",
    );
  });

  it("requires a user id for user-scoped memory", () => {
    assert.throws(
      () => buildMemoryNamespace({ scope: "user", profileId: "profile_1" }),
      /user id/i,
    );
  });

  it("rejects memory writes over the configured max chars", () => {
    assert.throws(
      () =>
        assertMemoryWriteAllowed({
          memory: memoryConfig({ maxMemoryChars: 8 }),
          value: "x".repeat(9),
          namespace: "profile:profile_1",
        }),
      /memory size/i,
    );

    assert.throws(
      () =>
        assertMemoryWriteAllowed({
          memory: memoryConfig({ maxMemoryChars: AGENT_LIMITS.maxMemoryChars + 100 }),
          value: "x".repeat(AGENT_LIMITS.maxMemoryChars + 1),
          namespace: "profile:profile_1",
        }),
      /memory size/i,
    );
  });

  it("rejects memory writes containing obvious secrets", () => {
    assert.throws(
      () =>
        assertMemoryWriteAllowed({
          memory: memoryConfig(),
          value: { apiKey: "sk-live-secret-value" },
          namespace: "profile:profile_1",
        }),
      /secret/i,
    );
  });

  it("requires explicit writeEnabled memory config", () => {
    assert.throws(
      () =>
        assertMemoryWriteAllowed({
          memory: memoryConfig({ writeEnabled: false }),
          value: "remember this",
          namespace: "profile:profile_1",
        }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MEMORY_WRITE_DISABLED",
    );
  });
});

function memoryConfig(overrides: Partial<AiMemoryNodeConfig> = {}): AiMemoryNodeConfig {
  return {
    type: "ai-memory",
    name: "Profile Memory",
    scope: "profile",
    readEnabled: true,
    writeEnabled: true,
    maxRetrievedMemories: 4,
    maxMemoryChars: AGENT_LIMITS.maxMemoryChars,
    ...overrides,
  };
}
