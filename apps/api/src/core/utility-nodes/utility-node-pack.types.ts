import type { UtilityNodeType } from "../nodes/types.ts";

export type { UtilityNodeType };

export interface UtilityNodeStyle {
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

export type NodeRole = "flow" | "configuration";
export type NodeHandleType = "source" | "target";
export type NodeHandlePosition = "top" | "left" | "bottom" | "right";
export type NodeHandleStyle = "circle" | "diamond";
export type NodeCardinality = "one" | "many";
export type NodeConnectionPolicy = "replace" | "append";

export interface NodeCapabilitySelector {
  capability: string;
  providerId?: string;
  methodId?: string;
}

export interface UtilityNodeHandleDefinition {
  id: string;
  label: string;
  type: NodeHandleType;
  position: NodeHandlePosition;
  style?: NodeHandleStyle;
  required?: boolean;
  accepts?: NodeCapabilitySelector[];
  allowedNodes?: string[] | "*";
  cardinality?: NodeCardinality;
  connectionPolicy?: NodeConnectionPolicy;
  quickAdd?: "capability";
  quickAddAfterConnected?: boolean;
}

export interface UtilityNodePresentation {
  base: "standard" | "advanced";
  rounded?: "sm" | "md" | "lg" | "full";
  borderStyle?: "default" | "dashed";
  autoOrganize?: boolean;
}

export interface UtilityNodeManifestEntry {
  type: UtilityNodeType;
  label: string;
  description: string;
  category: "AI" | "Core" | "Flow" | "Data transformation" | "Developer";
  style: UtilityNodeStyle;
  role: NodeRole;
  capabilities: string[];
  handles: UtilityNodeHandleDefinition[];
  presentation: UtilityNodePresentation;
}

export type UtilityNodeManifestInput = Omit<UtilityNodeManifestEntry, "role" | "capabilities" | "handles" | "presentation"> &
  Partial<Pick<UtilityNodeManifestEntry, "role" | "capabilities" | "handles" | "presentation">>;

export interface UtilityNodePack {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: Partial<Record<UtilityNodeType, UtilityNodeManifestEntry>>;
}

export interface UtilityNodePackInput extends Omit<UtilityNodePack, "nodes"> {
  nodes: Partial<Record<UtilityNodeType, UtilityNodeManifestInput>>;
}

export interface UtilityNodeCatalogItem extends UtilityNodeManifestEntry {
  packId: string;
  packName: string;
}
