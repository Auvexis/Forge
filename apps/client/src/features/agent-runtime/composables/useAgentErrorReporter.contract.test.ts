import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("agent operational errors use persistent Toast notifications", () => {
  const reporter = read("src/features/agent-runtime/composables/useAgentErrorReporter.ts");
  const modal = read("src/features/agent-runtime/components/AgentChatModal.vue");
  const session = read("src/features/agent-runtime/components/AgentSessionPanel.vue");

  assert.match(reporter, /toast\.error/);
  assert.match(reporter, /category: 'agents'/);
  assert.match(reporter, /source: 'agent-runtime'/);
  assert.match(modal, /reportAgentError/);
  assert.match(session, /reportAgentError/);
  assert.doesNotMatch(modal, /errorMessage/)
  assert.doesNotMatch(session, /agent-session-panel__error/)
});
