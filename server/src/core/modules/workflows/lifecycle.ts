import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import type { TriggerRegistrationContext } from "../../../shared/models/plugin-types.ts";
import { PluginManager } from "../plugins/manager.ts";
import { CredentialStore } from "../plugins/credential-store.ts";
import { Vault } from "../plugins/vault.ts";
import { AppRepository } from "../app/app-repository.ts";

// ──────────── WorkflowLifecycleManager ────────────
//
// Responsible for orchestrating plugin trigger setup/teardown when a workflow's
// active state changes. This module is pure core: it knows about the generic
// plugin contract (setup/teardown), but ZERO knowledge about specific plugins.
//
// Call activate() when a workflow becomes active (publish).
// Call deactivate() when a workflow becomes inactive (unpublish / delete).

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;

function resolvePublicUrl(): string {
  const configuredPublicUrl = AppRepository.getSetting("public_url");
  if (typeof configuredPublicUrl === "string" && configuredPublicUrl.trim()) {
    return configuredPublicUrl.trim();
  }
  return process.env.PUBLIC_URL || `http://localhost:${SERVER_PORT}`;
}

/**
 * Builds the webhook URL for the given webhook path.
 * In production this would be the publicly accessible URL.
 */
function buildWebhookUrl(webhookPath: string): string {
  return `${resolvePublicUrl()}/webhook/${webhookPath}`;
}

/**
 * Resolves TriggerRegistrationContext for a plugin trigger workflow.
 * Returns null if the plugin is not found or the trigger type isn't "plugin".
 */
async function buildTriggerContext(
  workflow: WorkflowItem,
): Promise<TriggerRegistrationContext | null> {
  const { trigger } = workflow;

  if (
    trigger.type !== "plugin" ||
    !trigger.pluginId ||
    !trigger.triggerName
  ) {
    return null;
  }

  // Resolve the webhook URL — plugin triggers reuse the generic webhook path
  const webhookPath =
    trigger.webhookSlug || trigger.webhookPath || workflow.metadata.id;
  const webhookUrl = buildWebhookUrl(webhookPath);

  // Resolve credentials (same pipeline as PluginExecutor, keeping it DRY)
  const plugin = PluginManager.getPlugin(trigger.pluginId);
  const schema = (plugin.auth as any).credentialSchema;
  const storedCredentials = CredentialStore.getCredentials(trigger.pluginId) ?? {};
  let credentials = schema
    ? Vault.mergeWithStored(trigger.pluginId, schema, storedCredentials)
    : storedCredentials;
  credentials = Vault.resolveEnvExpressions(credentials);

  const tokens = CredentialStore.getTokens(trigger.pluginId) ?? undefined;

  return {
    webhookUrl,
    credentials,
    tokens,
    params: trigger.triggerParams ?? {},
    workflowId: workflow.metadata.id,
  };
}

// ──────────── Public API ────────────

export const WorkflowLifecycleManager = {
  /**
   * Called when a workflow transitions to active/published state.
   * If the trigger type is "plugin" and the plugin defines a setup hook,
   * we call it here. Any error from setup() propagates to the caller so the
   * route layer can return a meaningful error (e.g. "Invalid bot token").
   */
  async activate(workflow: WorkflowItem): Promise<void> {
    const ctx = await buildTriggerContext(workflow);
    if (!ctx) return; // Not a plugin trigger — nothing to do

    const plugin = PluginManager.getPlugin(workflow.trigger.pluginId!);
    const triggerHooks = plugin.triggers?.[workflow.trigger.triggerName!];

    if (!triggerHooks) {
      console.warn(
        `[NOD8 | LIFECYCLE]: Plugin '${workflow.trigger.pluginId}' has no trigger '${workflow.trigger.triggerName}' hooks registered.`,
      );
      return;
    }

    console.log(
      `[NOD8 | LIFECYCLE]: Calling setup() for plugin '${workflow.trigger.pluginId}' / trigger '${workflow.trigger.triggerName}' (workflow: ${workflow.metadata.id})`,
    );

    await triggerHooks.setup(ctx);

    console.log(
      `[NOD8 | LIFECYCLE]: setup() completed for workflow '${workflow.metadata.id}'`,
    );
  },

  /**
   * Called when a workflow transitions to inactive state (unpublish / delete).
   * Calls teardown() so the plugin can clean up (e.g. deleteWebhook on Telegram).
   * Errors during teardown are logged but NOT propagated — we don't want a broken
   * 3rd-party API to block the user from unpublishing their workflow.
   */
  async deactivate(workflow: WorkflowItem): Promise<void> {
    const ctx = await buildTriggerContext(workflow);
    if (!ctx) return;

    const plugin = PluginManager.getPlugin(workflow.trigger.pluginId!);
    const triggerHooks = plugin.triggers?.[workflow.trigger.triggerName!];

    if (!triggerHooks) return;

    console.log(
      `[NOD8 | LIFECYCLE]: Calling teardown() for plugin '${workflow.trigger.pluginId}' / trigger '${workflow.trigger.triggerName}' (workflow: ${workflow.metadata.id})`,
    );

    try {
      await triggerHooks.teardown(ctx);
      console.log(
        `[NOD8 | LIFECYCLE]: teardown() completed for workflow '${workflow.metadata.id}'`,
      );
    } catch (err: any) {
      // Teardown errors are non-fatal — log and move on
      console.error(
        `[NOD8 | LIFECYCLE]: teardown() failed for workflow '${workflow.metadata.id}': ${err.message}`,
      );
    }
  },
};
