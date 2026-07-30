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
