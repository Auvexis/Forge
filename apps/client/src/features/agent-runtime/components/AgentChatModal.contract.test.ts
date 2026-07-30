import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("agent chats are hosted by the global BaseModal", () => {
  const modal = read("src/features/agent-runtime/components/AgentChatModal.vue");
  const app = read("src/app/App.vue");
  const navigation = read("src/shared/components/layout/appSidebarNavigation.ts");
  const router = read("src/app/router.ts");

  assert.match(modal, /<BaseModal/);
  assert.match(app, /<AgentChatModal/);
  assert.match(app, /intent\?\.type === 'agents\.open'/);
  assert.match(navigation, /intent: \{ type: 'agents\.open' \}/);
  assert.doesNotMatch(router, /path: '\/agents'/);
  assert.doesNotMatch(router, /AgentsPage/);
});

test("agent messages and tool steps reconcile while a run is still active", () => {
  const modal = read("src/features/agent-runtime/components/AgentChatModal.vue");
  const panel = read("src/features/agent-runtime/components/AgentSessionPanel.vue");
  const timeline = read("src/features/agent-runtime/components/AgentSessionTimeline.vue");
  const snapshot = read("src/features/agent-runtime/composables/useAgentSessionSnapshot.ts");
  const api = read("src/core/api/agent-chat.api.ts");

  assert.match(modal, /startLiveMessage\(message\)/);
  assert.match(modal, /draft\.value = ''[\s\S]*await agentChatApi\.sendMessage/);
  assert.match(panel, /visibleOptimisticMessages/);
  assert.match(timeline, /pendingUserMessages/);
  assert.match(snapshot, /liveRuns > 0/);
  assert.match(snapshot, /active \? 300 : 1_000/);
  assert.match(api, /getSessionSnapshot[\s\S]*cache: 'no-store'/);
});
