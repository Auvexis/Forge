import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import type { PluginTriggerRuntimeContext } from "./plugin-trigger-runtime.ts";
import { PluginManager } from "../plugins/manager.ts";
import { CredentialStore } from "../plugins/credential-store.ts";
import { Vault } from "../plugins/vault.ts";
import { AppRepository } from "../app/app-repository.ts";
import {
  getTriggerWebhookPath,
  listPluginTriggers,
  type WorkflowTriggerEntry,
} from "./workflow-triggers.ts";
import { PluginTriggerRuntime } from "./plugin-trigger-runtime.ts";

const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;

export interface WorkflowLifecycleOptions {
  mode?: "prod" | "test";
  profileId?: string;
}

function resolvePublicUrl(): string {
  const configuredPublicUrl = AppRepository.getSetting("public_url");
  if (typeof configuredPublicUrl === "string" && configuredPublicUrl.trim()) {
    return configuredPublicUrl.trim();
  }
  return process.env.PUBLIC_URL || `http://localhost:${SERVER_PORT}`;
}

function buildPluginEventUrl(
  workflow: WorkflowItem,
  entry: WorkflowTriggerEntry,
  options: WorkflowLifecycleOptions = {},
): string {
  const trigger = entry.trigger;
  const suffix = `plugin-events/${encodeURIComponent(workflow.metadata.id)}/${encodeURIComponent(entry.id)}/${encodeURIComponent(trigger.pluginId ?? "")}/${encodeURIComponent(trigger.triggerName ?? "")}`;
  if (options.profileId) {
    return `${resolvePublicUrl()}/p/${encodeURIComponent(options.profileId)}/${suffix}`;
  }
  return `${resolvePublicUrl()}/${suffix}`;
}

async function buildTriggerContext(
  workflow: WorkflowItem,
  entry: WorkflowTriggerEntry,
  options: WorkflowLifecycleOptions = {},
): Promise<PluginTriggerRuntimeContext | null> {
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
    pluginId: trigger.pluginId,
    triggerName: trigger.triggerName,
    triggerNodeId: entry.id,
    webhookUrl: buildPluginEventUrl(workflow, entry, options),
    credentials,
    tokens,
    params: trigger.triggerParams ?? {},
    workflowId: workflow.metadata.id,
  };
}

export const WorkflowLifecycleManager = {
  async activate(
    workflow: WorkflowItem,
    options: WorkflowLifecycleOptions = {},
  ): Promise<void> {
    for (const entry of listPluginTriggers(workflow)) {
      const ctx = await buildTriggerContext(workflow, entry, options);
      if (!ctx) continue;

      console.log(
        `[SAILOR | LIFECYCLE]: Calling setup() for plugin '${entry.trigger.pluginId}' / trigger '${entry.trigger.triggerName}' (workflow: ${workflow.metadata.id}/${entry.id})`,
      );

      await PluginTriggerRuntime.setup(ctx);

      console.log(
        `[SAILOR | LIFECYCLE]: setup() completed for workflow '${workflow.metadata.id}/${entry.id}'`,
      );
    }
  },

  async deactivate(
    workflow: WorkflowItem,
    options: WorkflowLifecycleOptions = {},
  ): Promise<void> {
    for (const entry of listPluginTriggers(workflow)) {
      const ctx = await buildTriggerContext(workflow, entry, options);
      if (!ctx) continue;

      console.log(
        `[SAILOR | LIFECYCLE]: Calling teardown() for plugin '${entry.trigger.pluginId}' / trigger '${entry.trigger.triggerName}' (workflow: ${workflow.metadata.id}/${entry.id})`,
      );

      try {
        await PluginTriggerRuntime.teardown(ctx);
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
