import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../workflows/repository.ts";
import {
  getTriggerEntry,
  getTriggerFormPublicId,
  resolveFormTrigger,
  type ResolvedWorkflowTrigger,
} from "../workflows/workflow-triggers.ts";
import { normalizeFormFields } from "./form-fields.ts";
import { normalizeFormTheme } from "./form-theme.ts";
import type { FormMode } from "./form-types.ts";

export function formPublicId(workflow: WorkflowItem, triggerNodeId = "trigger"): string {
  const entry = getTriggerEntry(workflow, triggerNodeId);
  return entry ? getTriggerFormPublicId(workflow, entry) : workflow.metadata.id;
}

export function resolveFormWorkflowTrigger(
  formId: string,
  opts: { requireActive: boolean },
): ResolvedWorkflowTrigger | null {
  const workflows = WorkflowRepository.getWorkflows();
  return resolveFormTrigger(workflows, formId, opts);
}

export function resolveFormWorkflow(
  formId: string,
  opts: { requireActive: boolean },
): WorkflowItem | null {
  return resolveFormWorkflowTrigger(formId, opts)?.workflow ?? null;
}

export function formDefinition(
  workflow: WorkflowItem,
  mode: FormMode,
  triggerNodeId = "trigger",
) {
  const entry = getTriggerEntry(workflow, triggerNodeId);
  const trigger = entry?.trigger ?? workflow.trigger;

  return {
    id: formPublicId(workflow, triggerNodeId),
    workflowId: workflow.metadata.id,
    triggerNodeId,
    mode,
    title: trigger.formTitle?.trim() || workflow.metadata.name,
    description: trigger.formDescription?.trim() || "",
    fields: normalizeFormFields(trigger.formFields),
    theme: normalizeFormTheme(trigger.formTheme),
  };
}
