import type { UtilityNodeType } from "../nodes/types.ts";

export type { UtilityNodeType };

export interface UtilityNodeStyle {
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

export interface UtilityNodeManifestEntry {
  type: UtilityNodeType;
  label: string;
  description: string;
  category: "AI" | "Core" | "Flow" | "Data transformation" | "Developer";
  style: UtilityNodeStyle;
}

export interface UtilityNodePack {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: Partial<Record<UtilityNodeType, UtilityNodeManifestEntry>>;
}

export interface UtilityNodeCatalogItem extends UtilityNodeManifestEntry {
  packId: string;
  packName: string;
}
