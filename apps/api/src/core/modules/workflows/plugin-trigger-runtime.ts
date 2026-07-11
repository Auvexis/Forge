import type { FabricPlugin, TriggerRegistrationContext } from "@auvexis/fabric-sdk";
import { PluginManager } from "../plugins/manager.ts";

export interface PluginTriggerRuntimeContext extends TriggerRegistrationContext {
  triggerNodeId: string;
  pluginId: string;
  triggerName: string;
}

export interface PluginTriggerRuntimePluginRegistry {
  getPlugin(id: string): FabricPlugin;
}

export class PluginTriggerRuntimeService {
  private readonly plugins: PluginTriggerRuntimePluginRegistry;

  constructor(plugins: PluginTriggerRuntimePluginRegistry = PluginManager) {
    this.plugins = plugins;
  }

  async setup(context: PluginTriggerRuntimeContext): Promise<void> {
    const triggerHooks = this.getTriggerHooks(context, "setup");
    if (!triggerHooks) return;
    await triggerHooks.setup(this.toRegistrationContext(context));
  }

  async teardown(context: PluginTriggerRuntimeContext): Promise<void> {
    const triggerHooks = this.getTriggerHooks(context, "teardown");
    if (!triggerHooks) return;
    await triggerHooks.teardown(this.toRegistrationContext(context));
  }

  private getTriggerHooks(
    context: PluginTriggerRuntimeContext,
    operation: "setup" | "teardown",
  ): NonNullable<FabricPlugin["triggers"]>[string] | null {
    const plugin = this.getRegisteredPlugin(context.pluginId, operation);
    const manifestTrigger = plugin.manifest.triggers?.[context.triggerName];

    if (!manifestTrigger) {
      throw new Error(
        `Plugin trigger ${operation} failed: plugin '${context.pluginId}' does not declare trigger '${context.triggerName}'`,
      );
    }

    const triggerHooks = plugin.triggers?.[context.triggerName];
    if (!triggerHooks) {
      console.warn(
        `[FABRIC | PLUGIN-TRIGGERS]: Plugin '${context.pluginId}' declares trigger '${context.triggerName}' without runtime ${operation} hook; treating as no-op.`,
      );
      return null;
    }

    return triggerHooks;
  }

  private getRegisteredPlugin(pluginId: string, operation: "setup" | "teardown"): FabricPlugin {
    try {
      return this.plugins.getPlugin(pluginId);
    } catch {
      throw new Error(`Plugin trigger ${operation} failed: plugin '${pluginId}' is not registered`);
    }
  }

  private toRegistrationContext(context: PluginTriggerRuntimeContext): TriggerRegistrationContext {
    return {
      webhookUrl: context.webhookUrl,
      credentials: context.credentials,
      tokens: context.tokens,
      params: context.params,
      workflowId: context.workflowId,
    };
  }
}

export const PluginTriggerRuntime = new PluginTriggerRuntimeService();
