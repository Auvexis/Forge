import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../workflows/repository.ts";
import { normalizeFormFields } from "./form-fields.ts";
import { normalizeFormTheme } from "./form-theme.ts";
import type { FormMode } from "./form-types.ts";

export function formPublicId(workflow: WorkflowItem): string {
  return workflow.trigger.formSlug?.trim() || workflow.metadata.id;
}

export function resolveFormWorkflow(
  formId: string,
  opts: { requireActive: boolean },
): WorkflowItem | null {
  const workflows = WorkflowRepository.getWorkflows();
  return (
    workflows.find((workflow) => {
      if (workflow.trigger.type !== "form") return false;
      if (opts.requireActive && !workflow.metadata.isActive) return false;
      return (
        workflow.metadata.id === formId || workflow.trigger.formSlug === formId
      );
    }) ?? null
  );
}

export function formDefinition(workflow: WorkflowItem, mode: FormMode) {
  return {
    id: formPublicId(workflow),
    workflowId: workflow.metadata.id,
    mode,
    title: workflow.trigger.formTitle?.trim() || workflow.metadata.name,
    description: workflow.trigger.formDescription?.trim() || "",
    fields: normalizeFormFields(workflow.trigger.formFields),
    theme: normalizeFormTheme(workflow.trigger.formTheme),
  };
}
