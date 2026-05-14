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

export function getTriggerFormPublicId(
  workflow: WorkflowItem,
  entry: WorkflowTriggerEntry,
): string {
  return entry.trigger.formSlug?.trim() || workflow.metadata.id;
}

export function getTriggerWebhookPath(
  workflow: WorkflowItem,
  entry: WorkflowTriggerEntry,
): string | null {
  return entry.trigger.webhookSlug || entry.trigger.webhookPath || (
    entry.trigger.type === "plugin" ? workflow.metadata.id : null
  );
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
  const realTriggers: WorkflowTriggerEntry[] = [];

  for (const [id, node] of Object.entries(workflow.nodes)) {
    if (!isTriggerNode(node)) continue;
    realTriggers.push({
      id,
      name: node.name,
      workflow,
      node,
      trigger: triggerConfigForNode(node),
      disabled: node.disabled === true,
      legacy: false,
    });
  }

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
      if (workflow.metadata.id !== formId && getTriggerFormPublicId(workflow, entry) !== formId) continue;
      return { workflow, triggerNodeId: entry.id, entry };
    }
  }

  return null;
}

export function listCronTriggers(workflows: WorkflowItem[]): ResolvedWorkflowTrigger[] {
  const resolved: ResolvedWorkflowTrigger[] = [];

  for (const workflow of workflows) {
    for (const entry of listTriggerEntries(workflow)) {
      if (entry.disabled) continue;
      if (entry.trigger.type !== "cron" || !entry.trigger.cronExpression) continue;
      resolved.push({ workflow, triggerNodeId: entry.id, entry });
    }
  }

  return resolved;
}

export function resolveEventTriggers(
  workflows: WorkflowItem[],
  eventName: string,
): ResolvedWorkflowTrigger[] {
  const resolved: ResolvedWorkflowTrigger[] = [];

  for (const workflow of workflows) {
    for (const entry of listTriggerEntries(workflow)) {
      if (entry.disabled) continue;
      if (entry.trigger.type !== "event") continue;
      if (entry.trigger.eventName !== eventName) continue;
      resolved.push({ workflow, triggerNodeId: entry.id, entry });
    }
  }

  return resolved;
}

export function listPluginTriggers(workflow: WorkflowItem): WorkflowTriggerEntry[] {
  return listTriggerEntries(workflow).filter((entry) => {
    return (
      !entry.disabled &&
      entry.trigger.type === "plugin" &&
      Boolean(entry.trigger.pluginId) &&
      Boolean(entry.trigger.triggerName)
    );
  });
}
