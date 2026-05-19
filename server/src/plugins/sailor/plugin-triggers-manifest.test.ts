import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { validateManifest } from "../../core/modules/plugins/loader.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const expectedTriggers: Record<string, string[]> = {
  "telegram": ["onMessage", "onCommand", "onCallbackQuery"],
  "discord": ["onMessage", "onSlashCommand", "onReaction"],
  "slack": ["onMessage", "onMention", "onAppHomeOpened"],
  "google-gmail": ["onNewEmail", "onEmailMatchingFilter", "onAttachmentReceived"],
  "google-calendar": ["onEventCreated", "onEventStartingSoon", "onEventUpdated"],
  "google-drive": ["onFileCreated", "onFileUpdated", "onFolderChanged"],
  "google-sheets": ["onRowAdded", "onRowUpdated", "onSheetChanged"],
  "github": ["onIssueOpened", "onPullRequestOpened", "onPullRequestReview", "onWorkflowFailed"],
  "jira": ["onIssueCreated", "onIssueUpdated", "onStatusChanged"],
  "trello": ["onCardCreated", "onCardMoved", "onCommentAdded"],
  "notion": ["onPageCreated", "onDatabaseItemCreated", "onDatabaseItemUpdated"],
  "postgresql": ["onRowInserted", "onRowUpdated", "onQueryMatch"],
  "supabase": ["onRowInserted", "onRowUpdated", "onAuthUserCreated"],
  "google-youtube": ["onNewVideo", "onNewComment", "onChannelUpdate"],
};

describe("built-in plugin trigger manifests", () => {
  for (const [pluginDir, triggerNames] of Object.entries(expectedTriggers)) {
    it(`${pluginDir} declares supported event triggers`, () => {
      const manifestPath = path.join(currentDir, pluginDir, "manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      assert.deepEqual(Object.keys(manifest.triggers ?? {}), triggerNames);
      assert.deepEqual(validateManifest(manifest), []);

      for (const triggerName of triggerNames) {
        const trigger = manifest.triggers[triggerName];
        assert.ok(trigger.delivery?.mode, `${pluginDir}.${triggerName} missing delivery.mode`);
        assert.ok(trigger.payloadSchema, `${pluginDir}.${triggerName} missing payloadSchema`);
      }
    });
  }
});
