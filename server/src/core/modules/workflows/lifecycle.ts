import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import type { TriggerRegistrationContext } from "@auvexis/sailor-sdk";
import { PluginManager } from "../plugins/manager.ts";
import { CredentialStore } from "../plugins/credential-store.ts";
import { Vault } from "../plugins/vault.ts";
import { AppRepository } from "../app/app-repository.ts";
import {
  getTriggerWebhookPath,
  listPluginTriggers,
  type WorkflowTriggerEntry,
} from "./workflow-triggers.ts";

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;

function resolvePublicUrl(): string {
  const configuredPublicUrl = AppRepository.getSetting("public_url");
  if (typeof configuredPublicUrl === "string" && configuredPublicUrl.trim()) {
    return configuredPublicUrl.trim();
  }
  return process.env.PUBLIC_URL || `http://localhost:${SERVER_PORT}`;
}

function buildWebhookUrl(webhookPath: string, mode: "prod" | "test" = "prod"): string {
  const path = mode === "test" ? "webhook-test" : "webhook";
  return `${resolvePublicUrl()}/${path}/${webhookPath}`;
}

async function buildTriggerContext(
  workflow: WorkflowItem,
  entry: WorkflowTriggerEntry,
  mode: "prod" | "test" = "prod",
): Promise<TriggerRegistrationContext | null> {
  const { trigger } = entry;

  if (
    trigger.type !== "plugin" ||
    !trigger.pluginId ||
    !trigger.triggerName
  ) {
    return null;
  }

  const webhookPath = getTriggerWebhookPath(workflow, entry);
  if (!webhookPath) return null;

  const plugin = PluginManager.getPlugin(trigger.pluginId);
  const schema = (plugin.auth as any).credentialSchema;
  const storedCredentials = CredentialStore.getCredentials(trigger.pluginId) ?? {};
  let credentials = schema
    ? Vault.mergeWithStored(trigger.pluginId, schema, storedCredentials)
    : storedCredentials;
  credentials = Vault.resolveEnvExpressions(credentials);

  const tokens = CredentialStore.getTokens(trigger.pluginId) ?? undefined;

  return {
    webhookUrl: buildWebhookUrl(webhookPath, mode),
    credentials,
    tokens,
    params: trigger.triggerParams ?? {},
    workflowId: workflow.metadata.id,
  };
}

export const WorkflowLifecycleManager = {
  async activate(
    workflow: WorkflowItem,
    options: { mode?: "prod" | "test" } = {},
  ): Promise<void> {
    for (const entry of listPluginTriggers(workflow)) {
      const ctx = await buildTriggerContext(workflow, entry, options.mode ?? "prod");
      if (!ctx) continue;

      const plugin = PluginManager.getPlugin(entry.trigger.pluginId!);
      const triggerHooks = plugin.triggers?.[entry.trigger.triggerName!];

      if (!triggerHooks) {
        console.warn(
          `[SAILOR | LIFECYCLE]: Plugin '${entry.trigger.pluginId}' has no trigger '${entry.trigger.triggerName}' hooks registered.`,
        );
        continue;
      }

      console.log(
        `[SAILOR | LIFECYCLE]: Calling setup() for plugin '${entry.trigger.pluginId}' / trigger '${entry.trigger.triggerName}' (workflow: ${workflow.metadata.id}/${entry.id})`,
      );

      await triggerHooks.setup(ctx);

      console.log(
        `[SAILOR | LIFECYCLE]: setup() completed for workflow '${workflow.metadata.id}/${entry.id}'`,
      );
    }
  },

  async deactivate(
    workflow: WorkflowItem,
    options: { mode?: "prod" | "test" } = {},
  ): Promise<void> {
    for (const entry of listPluginTriggers(workflow)) {
      const ctx = await buildTriggerContext(workflow, entry, options.mode ?? "prod");
      if (!ctx) continue;

      const plugin = PluginManager.getPlugin(entry.trigger.pluginId!);
      const triggerHooks = plugin.triggers?.[entry.trigger.triggerName!];

      if (!triggerHooks) continue;

      console.log(
        `[SAILOR | LIFECYCLE]: Calling teardown() for plugin '${entry.trigger.pluginId}' / trigger '${entry.trigger.triggerName}' (workflow: ${workflow.metadata.id}/${entry.id})`,
      );

      try {
        await triggerHooks.teardown(ctx);
        console.log(
          `[SAILOR | LIFECYCLE]: teardown() completed for workflow '${workflow.metadata.id}/${entry.id}'`,
        );
      } catch (err: any) {
        console.error(
          `[SAILOR | LIFECYCLE]: teardown() failed for workflow '${workflow.metadata.id}/${entry.id}': ${err.message}`,
        );
      }
    }
  },
};
