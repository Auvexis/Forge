import { bench, describe } from "vitest";
import type {
  AgentMessageWithParts,
  AgentSessionSnapshot,
} from "../session/agent-session-contracts.ts";
import { AgentContextEngine } from "./agent-context-engine.ts";

const compactSnapshot = makeSnapshot(100, 256);
const loadSnapshot = makeSnapshot(2_000, 1_024);
let loadIteration = 0;

describe("AgentContextEngine", () => {
  bench("reuses a cached projection for 100 persisted messages", () => {
    new AgentContextEngine().build(compactSnapshot, {
      contextWindowTokens: 16_000,
      reservedOutputTokens: 2_000,
    });
  });

  bench("compacts 2,000 messages with large tool outputs", () => {
    loadIteration += 1;
    new AgentContextEngine().build({
      ...loadSnapshot,
      session: {
        ...loadSnapshot.session,
        id: `benchmark_session_${loadIteration}`,
      },
    }, {
      contextWindowTokens: 8_000,
      reservedOutputTokens: 1_000,
      maxToolResultChars: 2_000,
    });
  });
});

function makeSnapshot(messageCount: number, payloadChars: number): AgentSessionSnapshot {
  const timestamp = "2026-07-30T00:00:00.000Z";
  const messages: AgentMessageWithParts[] = Array.from(
    { length: messageCount },
    (_, index) => {
      const sequence = index + 1;
      const turnId = `turn_${sequence}`;
      const messageId = `message_${sequence}`;
      return {
        message: {
          id: messageId,
          sessionId: "benchmark_session",
          turnId,
          role: index % 2 === 0 ? "user" : "assistant",
          sequence,
          createdAt: timestamp,
          completedAt: timestamp,
        },
        parts: [{
          id: `part_${sequence}`,
          sessionId: "benchmark_session",
          turnId,
          messageId,
          type: "text",
          sequence: 1,
          text: `${sequence}:${"x".repeat(payloadChars)}`,
          state: "completed",
          createdAt: timestamp,
          updatedAt: timestamp,
        }],
      };
    },
  );
  return {
    session: {
      id: "benchmark_session",
      profileId: "benchmark_profile",
      workflowId: "benchmark_workflow",
      triggerNodeId: "benchmark_trigger",
      title: "Benchmark",
      state: "active",
      revision: messageCount,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    activeTurn: null,
    messages,
    pendingInteraction: null,
    revision: messageCount,
  };
}
