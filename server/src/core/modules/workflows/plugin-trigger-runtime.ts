import type { SailorPlugin, TriggerRegistrationContext } from "@auvexis/sailor-sdk";
import { PluginManager } from "../plugins/manager.ts";

export interface PluginTriggerRuntimeContext extends TriggerRegistrationContext {
  triggerNodeId: string;
  pluginId: string;
  triggerName: string;
}

export interface PluginTriggerRuntimePluginRegistry {
  getPlugin(id: string): SailorPlugin;
}

export class PluginTriggerRuntimeService {
  constructor(
    private readonly plugins: PluginTriggerRuntimePluginRegistry = PluginManager,
  ) {}

  async setup(context: PluginTriggerRuntimeContext): Promise<void> {
    const triggerHooks = this.getTriggerHooks(context, "setup");
    await triggerHooks.setup(this.toRegistrationContext(context));
  }

  async teardown(context: PluginTriggerRuntimeContext): Promise<void> {
    const triggerHooks = this.getTriggerHooks(context, "teardown");
    await triggerHooks.teardown(this.toRegistrationContext(context));
  }

  private getTriggerHooks(
    context: PluginTriggerRuntimeContext,
    operation: "setup" | "teardown",
  ): NonNullable<SailorPlugin["triggers"]>[string] {
    const plugin = this.getRegisteredPlugin(context.pluginId, operation);
    const manifestTrigger = plugin.manifest.triggers?.[context.triggerName];

    if (!manifestTrigger) {
      throw new Error(
        `Plugin trigger ${operation} failed: plugin '${context.pluginId}' does not declare trigger '${context.triggerName}'`,
      );
    }

    const triggerHooks = plugin.triggers?.[context.triggerName];
    if (!triggerHooks) {
      throw new Error(
        `Plugin trigger ${operation} failed: plugin '${context.pluginId}' has no runtime hooks for trigger '${context.triggerName}'`,
      );
    }

    return triggerHooks;
  }

  private getRegisteredPlugin(pluginId: string, operation: "setup" | "teardown"): SailorPlugin {
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
