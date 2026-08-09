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
  assert.match(app, /:initial-chat-slug="agentChatInitialSlug"/);
  assert.match(app, /intent\?\.type === 'agents\.open'/);
  assert.match(navigation, /intent: \{ type: 'agents\.open' \}/);
  assert.doesNotMatch(router, /path: '\/agents'/);
  assert.doesNotMatch(router, /AgentsPage/);
  assert.match(modal, /initialChatSlug\?: string/);
  assert.match(modal, /selectChat\(nextChatSlug\)/);
});

test("agent messages and tool steps reconcile while a run is still active", () => {
  const modal = read("src/features/agent-runtime/components/AgentChatModal.vue");
  const panel = read("src/features/agent-runtime/components/AgentSessionPanel.vue");
  const timeline = read("src/features/agent-runtime/components/AgentSessionTimeline.vue");
  const snapshot = read("src/features/agent-runtime/composables/useAgentSessionSnapshot.ts");
  const api = read("src/core/api/agent-chat.api.ts");

  assert.match(modal, /startLiveMessage\(message\)/);
  assert.match(modal, /draft\.value = ["'][\s\S]*await agentChatApi\.sendMessage/);
  assert.match(panel, /visibleOptimisticMessages/);
  assert.match(timeline, /pendingUserMessages/);
  assert.match(snapshot, /liveRuns > 0/);
  assert.match(snapshot, /active \? 300 : 1_000/);
  assert.match(api, /getSessionSnapshot[\s\S]*cache: 'no-store'/);
});

test("agent chat modal exposes a polished directory and composer shell", () => {
  const modal = read("src/features/agent-runtime/components/AgentChatModal.vue");

  assert.match(modal, /agent-chat-modal__agent-action/);
  assert.match(modal, /chat\.agentAvatar/);
  assert.match(modal, /chat\.agentName/);
  assert.match(modal, /BaseToolDropdown/);
  assert.match(modal, /Rename chat/);
  assert.match(modal, /Delete chat/);
  assert.match(modal, /toggleChat\(chat\.chatSlug\)/);
  assert.match(modal, /startNewSessionFor\(chat\.chatSlug\)/);
  assert.match(modal, /agent-chat-modal__conversation-header/);
  assert.match(modal, /agent-chat-modal__composer-box/);
  assert.match(modal, /agent-chat-modal__welcome-icon/);
  assert.match(modal, /LucideIcon/);
  assert.doesNotMatch(modal, /agent-chat-modal__agent-count/);
  assert.doesNotMatch(modal, /agent-chat-modal__new-session/);
  assert.doesNotMatch(modal, /formatSessionTime/);
  assert.doesNotMatch(modal, /agent-chat-modal__titlebar/);
  assert.doesNotMatch(modal, /agent-chat-modal__search/);
});
