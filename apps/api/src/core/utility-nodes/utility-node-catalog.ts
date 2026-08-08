import type { UtilityNodeCatalogItem, UtilityNodeType } from "./utility-node-pack.types.ts";
import { fabricCoreUtilityNodePack } from "./fabric-core/manifest.ts";

export function listUtilityNodeCatalogItems(): UtilityNodeCatalogItem[] {
  return Object.values(fabricCoreUtilityNodePack.nodes)
    .filter((node) => node.catalogVisible)
    .map((node) => {
      const { catalogVisible: _catalogVisible, ...catalogNode } = node;
      return {
        ...catalogNode,
        packId: fabricCoreUtilityNodePack.id,
        packName: fabricCoreUtilityNodePack.name,
      };
    })
    .sort((left, right) => {
      const category = left.category.localeCompare(right.category);
      return category === 0 ? left.label.localeCompare(right.label) : category;
    });
}

export function getUtilityNodeCatalogItem(type: UtilityNodeType): UtilityNodeCatalogItem | null {
  const node = fabricCoreUtilityNodePack.nodes[type];
  if (!node) return null;
  const { catalogVisible: _catalogVisible, ...catalogNode } = node;
  return {
    ...catalogNode,
    packId: fabricCoreUtilityNodePack.id,
    packName: fabricCoreUtilityNodePack.name,
  };
}
