import type { UtilityNodeManifestEntry, UtilityNodePack, UtilityNodePackInput } from "./utility-node-pack.types.ts";

export function defineUtilityNodePack(pack: UtilityNodePackInput): UtilityNodePack {
  const nodes = Object.fromEntries(Object.entries(pack.nodes).map(([type, input]) => {
    const handles = input?.handles ?? [];
    const ids = handles.map((handle) => handle.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Utility node "${type}" has duplicate handle ids.`);
    for (const handle of handles) {
      if (handle.cardinality === "one" && handle.connectionPolicy === "append") {
        throw new Error(`Utility node "${type}" handle "${handle.id}" cannot append with one cardinality.`);
      }
    }
    return [type, {
      ...input,
      catalogVisible: input?.catalogVisible ?? true,
      role: input?.role ?? "flow",
      capabilities: input?.capabilities ?? [],
      handles,
      presentation: input?.presentation ?? { base: "standard" },
    } satisfies UtilityNodeManifestEntry];
  }));
  return { ...pack, nodes } as UtilityNodePack;
}
