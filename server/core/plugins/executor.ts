import { getPlugin } from "./registry.ts";

export async function executePluginMethod(
  pluginId: string,
  methodName: string,
  params: any,
) {
  const plugin = getPlugin(pluginId);

  if (!plugin) {
    throw new Error(`Plugin ${pluginId} not found`);
  }

  const method = plugin.methods[methodName];

  if (!method) {
    throw new Error(`Method ${methodName} not found in plugin ${pluginId}`);
  }

  return await method(params);
}
