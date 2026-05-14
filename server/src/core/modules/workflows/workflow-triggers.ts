import type {
  TriggerNode,
  WorkflowItem,
  WorkflowTrigger,
} from "../../../shared/models/workflow-types.ts";

export interface WorkflowTriggerEntry {
  id: string;
  name: string;
  workflow: WorkflowItem;
  node: TriggerNode | null;
  trigger: WorkflowTrigger;
  disabled: boolean;
  legacy: boolean;
}

export interface ResolvedWorkflowTrigger {
  workflow: WorkflowItem;
  triggerNodeId: string;
  entry: WorkflowTriggerEntry;
}

const LEGACY_TRIGGER_ID = "trigger";

function isTriggerNode(node: WorkflowItem["nodes"][string]): node is TriggerNode {
  return node.type === "trigger";
}

function triggerConfigForNode(node: TriggerNode): WorkflowTrigger {
  return node.trigger ?? ({ type: "manual" } satisfies WorkflowTrigger);
}

function publicFormId(workflow: WorkflowItem, entry: WorkflowTriggerEntry): string {
  return entry.trigger.formSlug?.trim() || workflow.metadata.id;
}

function webhookIds(workflow: WorkflowItem, entry: WorkflowTriggerEntry): string[] {
  const ids = [
    entry.trigger.webhookSlug,
    entry.trigger.webhookPath,
    entry.trigger.type === "plugin" ? workflow.metadata.id : undefined,
  ];
  return ids.filter((id): id is string => Boolean(id));
}

export function listTriggerEntries(workflow: WorkflowItem): WorkflowTriggerEntry[] {
  const realTriggers = Object.entries(workflow.nodes)
    .filter(([, node]) => isTriggerNode(node))
    .map(([id, node]) => ({
      id,
      name: node.name,
      workflow,
      node,
      trigger: triggerConfigForNode(node),
      disabled: node.disabled === true,
      legacy: false,
    }));

  if (realTriggers.length > 0) return realTriggers;

  return [{
    id: LEGACY_TRIGGER_ID,
    name: "Trigger",
    workflow,
    node: null,
    trigger: workflow.trigger,
    disabled: false,
    legacy: true,
  }];
}

export function getTriggerEntry(
  workflow: WorkflowItem,
  triggerNodeId = LEGACY_TRIGGER_ID,
): WorkflowTriggerEntry | null {
  return listTriggerEntries(workflow).find((entry) => entry.id === triggerNodeId) ?? null;
}

export function resolveWebhookTrigger(
  workflows: WorkflowItem[],
  webhookPath: string,
): ResolvedWorkflowTrigger | null {
  for (const workflow of workflows) {
    for (const entry of listTriggerEntries(workflow)) {
      if (entry.disabled) continue;
      if (entry.trigger.type !== "webhook" && entry.trigger.type !== "plugin") continue;
      if (!webhookIds(workflow, entry).includes(webhookPath)) continue;
      return { workflow, triggerNodeId: entry.id, entry };
    }
  }

  return null;
}

export function resolveFormTrigger(
  workflows: WorkflowItem[],
  formId: string,
  opts: { requireActive: boolean },
): ResolvedWorkflowTrigger | null {
  for (const workflow of workflows) {
    if (opts.requireActive && !workflow.metadata.isActive) continue;
    for (const entry of listTriggerEntries(workflow)) {
      if (entry.disabled) continue;
      if (entry.trigger.type !== "form") continue;
      if (workflow.metadata.id !== formId && publicFormId(workflow, entry) !== formId) continue;
      return { workflow, triggerNodeId: entry.id, entry };
    }
  }

  return null;
}
