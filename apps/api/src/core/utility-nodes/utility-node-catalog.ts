import type { UtilityNodeCatalogItem, UtilityNodeType } from "./utility-node-pack.types.ts";
import { sailorCoreUtilityNodePack } from "./sailor-core/manifest.ts";

export function listUtilityNodeCatalogItems(): UtilityNodeCatalogItem[] {
  return Object.values(sailorCoreUtilityNodePack.nodes)
    .map((node) => ({
      ...node,
      packId: sailorCoreUtilityNodePack.id,
      packName: sailorCoreUtilityNodePack.name,
    }))
    .sort((left, right) => {
      const category = left.category.localeCompare(right.category);
      return category === 0 ? left.label.localeCompare(right.label) : category;
    });
}

export function getUtilityNodeCatalogItem(type: UtilityNodeType): UtilityNodeCatalogItem | null {
  return listUtilityNodeCatalogItems().find((node) => node.type === type) ?? null;
}
