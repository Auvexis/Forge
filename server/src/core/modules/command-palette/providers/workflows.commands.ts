import { z } from "zod";

import { AppRepository } from "../../app/app-repository.ts";
import { Scheduler } from "../../scheduler/scheduler.ts";
import { CancellationRegistry } from "../../workflows/cancellation-registry.ts";
import { WorkflowEngine } from "../../workflows/executor.ts";
import { createDraftWorkflow } from "../../workflows/workflow-factory.ts";
import { WorkflowLifecycleManager } from "../../workflows/lifecycle.ts";
import { WorkflowRepository } from "../../workflows/repository.ts";
import { validateWorkflowDefinition } from "../../workflows/workflow-validation.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandExecutionResult,
  CommandHandler,
  CommandProvider,
} from "../command-types.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

interface WorkflowCommandServices {
  listWorkflows: () => WorkflowItem[];
  getWorkflowById: (id: string) => WorkflowItem | null;
  saveWorkflow: (workflow: WorkflowItem) => WorkflowItem;
  deleteWorkflow: (id: string) => void;
  deleteWorkflowExecutions: (workflowId: string) => void;
  publishWorkflow: (id: string) => WorkflowItem | null;
  unpublishWorkflow: (id: string) => WorkflowItem | null;
  executeWorkflow: (
    workflow: WorkflowItem,
    payload: unknown,
    executionId?: string,
  ) => Promise<unknown>;
  activateWorkflow: (workflow: WorkflowItem) => Promise<void>;
  deactivateWorkflow: (workflow: WorkflowItem) => Promise<void>;
  cancelExecution: (executionId: string) => void;
  resyncScheduler: () => void;
  getPublicUrl: () => string;
}

const renamePayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const savePayloadSchema = z.object({
  workflow: z.custom<WorkflowItem>((value) => typeof value === "object" && value !== null),
});

const importPayloadSchema = savePayloadSchema;

const runPayloadSchema = z.object({
  triggerPayload: z.record(z.string(), z.unknown()).optional(),
  executionId: z.string().trim().min(1).optional(),
});

const stopPayloadSchema = z.object({
  executionId: z.string().trim().min(1).optional(),
});

function resolvePublicUrl(): string {
  const configured = AppRepository.getSetting("public_url");
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 23801}`;
}

const defaultWorkflowServices: WorkflowCommandServices = {
  listWorkflows: WorkflowRepository.getWorkflows,
  getWorkflowById: WorkflowRepository.getWorkflowById,
  saveWorkflow: WorkflowRepository.saveWorkflow,
  deleteWorkflow: WorkflowRepository.deleteWorkflow,
  deleteWorkflowExecutions: WorkflowRepository.deleteWorkflowExecutions,
  publishWorkflow: WorkflowRepository.publishWorkflow,
  unpublishWorkflow: WorkflowRepository.unpublishWorkflow,
  executeWorkflow: WorkflowEngine.executeWorkflow,
  activateWorkflow: WorkflowLifecycleManager.activate,
  deactivateWorkflow: WorkflowLifecycleManager.deactivate,
  cancelExecution: CancellationRegistry.cancel,
  resyncScheduler: Scheduler.resync.bind(Scheduler),
  getPublicUrl: resolvePublicUrl,
};

function workflowServices(context: CommandExecutionContext): WorkflowCommandServices {
  return {
    ...defaultWorkflowServices,
    ...((context.services?.workflows as Partial<WorkflowCommandServices> | undefined) ?? {}),
  };
}

function activeWorkflow(context: CommandExecutionContext): WorkflowItem | null {
  if (!context.activeWorkflowId) return null;
  return workflowServices(context).getWorkflowById(context.activeWorkflowId);
}

function activeAvailability(context: CommandExecutionContext) {
  if (!context.activeWorkflowId) return { enabled: false, reason: "No active workflow" };
  if (!activeWorkflow(context)) return { enabled: false, reason: "Active workflow not found" };
  return { enabled: true };
}

function workflowResult(
  message: string,
  extra: Partial<CommandExecutionResult> = {},
): CommandExecutionResult {
  return {
    ok: true,
    message,
    refreshHints: ["workflows"],
    ...extra,
  };
}

function validateWorkflowOrThrow(workflow: WorkflowItem): void {
  const validationError = validateWorkflowDefinition(workflow);
  if (validationError) {
    throw new Error(`Invalid workflow: ${validationError}`);
  }
}

function withUpdatedWorkflow(workflow: WorkflowItem): WorkflowItem {
  return {
    ...workflow,
    metadata: {
      ...workflow.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
}

function buildWebhookUrl(workflow: WorkflowItem, services: WorkflowCommandServices): string | null {
  if (workflow.trigger.type !== "webhook" && workflow.trigger.type !== "plugin") return null;
  const path = workflow.trigger.webhookSlug || workflow.trigger.webhookPath || workflow.metadata.id;
  return `${services.getPublicUrl().replace(/\/$/, "")}/webhook/${path}`;
}

function webhookAvailability(context: CommandExecutionContext) {
  const workflow = activeWorkflow(context);
  if (!workflow) return { enabled: false, reason: "Active workflow not found" };
  return buildWebhookUrl(workflow, workflowServices(context))
    ? { enabled: true }
    : { enabled: false, reason: "Active workflow does not expose a webhook URL" };
}

function formAvailability(context: CommandExecutionContext) {
  const workflow = activeWorkflow(context);
  if (!workflow) return { enabled: false, reason: "Active workflow not found" };
  return buildFormUrl(workflow, workflowServices(context))
    ? { enabled: true }
    : { enabled: false, reason: "Active workflow does not expose a form URL" };
}

function buildFormUrl(workflow: WorkflowItem, services: WorkflowCommandServices): string | null {
  if (workflow.trigger.type !== "form") return null;
  const formId = workflow.trigger.formSlug?.trim() || workflow.metadata.id;
  return `${services.getPublicUrl().replace(/\/$/, "")}/forms/${formId}`;
}

function createWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.create",
      group: "workflow",
      label: "Create Workflow",
      description: "Create a new draft workflow",
      keywords: ["new workflow", "draft", "automation"],
      icon: "plus",
      availability: { enabled: true },
    }),
    execute: (context) => {
      const services = workflowServices(context);
      const workflow = services.saveWorkflow(createDraftWorkflow());
      services.resyncScheduler();
      return workflowResult("Workflow created", {
        navigation: { path: `/workflows/${workflow.metadata.id}` },
      });
    },
  };
}

function importWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.import",
      group: "workflow",
      label: "Import Workflow",
      description: "Import a workflow from a validated payload",
      keywords: ["json", "upload", "workflow"],
      icon: "upload",
      payloadSchema: importPayloadSchema,
      availability: { enabled: true },
    }),
    execute: (context, payload) => {
      const { workflow } = payload as z.infer<typeof importPayloadSchema>;
      validateWorkflowOrThrow(workflow);
      const services = workflowServices(context);
      const saved = services.saveWorkflow(withUpdatedWorkflow(workflow));
      services.resyncScheduler();
      return workflowResult("Workflow imported", {
        navigation: { path: `/workflows/${saved.metadata.id}` },
      });
    },
  };
}

function openWorkflowCommands(context: CommandExecutionContext): CommandHandler[] {
  return workflowServices(context).listWorkflows().map((workflow) => ({
    describe: (): CommandDescriptor => ({
      id: `workflow.open.${workflow.metadata.id}`,
      group: "workflow",
      label: `Open ${workflow.metadata.name}`,
      description: "Open workflow",
      keywords: [
        workflow.metadata.id,
        workflow.metadata.name,
        workflow.metadata.description ?? "",
        "open workflow",
      ],
      icon: "workflow",
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: "Workflow opened",
      navigation: { path: `/workflows/${workflow.metadata.id}` },
    }),
  }));
}

function activeWorkflowCommands(): CommandHandler[] {
  return [
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.save-active",
        group: "workflow",
        label: "Save Active Workflow",
        description: "Save the active workflow snapshot sent by the client",
        keywords: ["save workflow", "dirty", "snapshot"],
        icon: "save",
        payloadSchema: savePayloadSchema,
        availability: activeAvailability(context),
      }),
      execute: (context, payload) => {
        const { workflow } = payload as z.infer<typeof savePayloadSchema>;
        if (workflow.metadata.id !== context.activeWorkflowId) {
          throw new Error("Snapshot workflow id does not match active workflow");
        }
        validateWorkflowOrThrow(workflow);
        workflowServices(context).saveWorkflow(withUpdatedWorkflow(workflow));
        workflowServices(context).resyncScheduler();
        return workflowResult("Workflow saved");
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.rename-active",
        group: "workflow",
        label: "Rename Active Workflow",
        description: "Rename the active workflow",
        keywords: ["rename workflow", "title"],
        icon: "pencil",
        payloadSchema: renamePayloadSchema,
        availability: activeAvailability(context),
      }),
      execute: (context, payload) => {
        const workflow = activeWorkflow(context);
        if (!workflow) throw new Error("Active workflow not found");
        const { name } = payload as z.infer<typeof renamePayloadSchema>;
        const updated = withUpdatedWorkflow({
          ...workflow,
          metadata: { ...workflow.metadata, name },
        });
        workflowServices(context).saveWorkflow(updated);
        return workflowResult("Workflow renamed");
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.delete-active",
        group: "workflow",
        label: "Delete Active Workflow",
        description: "Delete the active workflow and its executions",
        keywords: ["remove workflow", "delete"],
        icon: "trash",
        destructive: true,
        availability: activeAvailability(context),
      }),
      execute: async (context) => {
        const workflow = activeWorkflow(context);
        if (!workflow || !context.activeWorkflowId) throw new Error("Active workflow not found");
        const services = workflowServices(context);
        services.deleteWorkflowExecutions(context.activeWorkflowId);
        services.deleteWorkflow(context.activeWorkflowId);
        services.resyncScheduler();
        await services.deactivateWorkflow(workflow);
        return workflowResult("Workflow deleted", {
          navigation: { path: "/workflows" },
        });
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.publish-active",
        group: "workflow",
        label: "Publish Active Workflow",
        description: "Publish active workflow to production",
        keywords: ["production", "publish", "activate"],
        icon: "rocket",
        availability: activeAvailability(context),
      }),
      execute: async (context) => {
        if (!context.activeWorkflowId) throw new Error("No active workflow");
        const services = workflowServices(context);
        const workflow = services.publishWorkflow(context.activeWorkflowId);
        if (!workflow) throw new Error("Active workflow not found");
        services.resyncScheduler();
        await services.activateWorkflow(workflow);
        return workflowResult("Workflow published");
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.unpublish-active",
        group: "workflow",
        label: "Unpublish Active Workflow",
        description: "Remove active workflow from production",
        keywords: ["production", "unpublish", "deactivate"],
        icon: "pause",
        availability: activeAvailability(context),
      }),
      execute: async (context) => {
        if (!context.activeWorkflowId) throw new Error("No active workflow");
        const services = workflowServices(context);
        const before = services.getWorkflowById(context.activeWorkflowId);
        const workflow = services.unpublishWorkflow(context.activeWorkflowId);
        if (!workflow) throw new Error("Active workflow not found");
        services.resyncScheduler();
        if (before) await services.deactivateWorkflow(before);
        return workflowResult("Workflow unpublished");
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.export-active",
        group: "workflow",
        label: "Export Active Workflow",
        description: "Copy serialized active workflow data",
        keywords: ["export workflow", "json", "download"],
        icon: "download",
        availability: activeAvailability(context),
      }),
      execute: (context) => {
        const workflow = activeWorkflow(context);
        if (!workflow) throw new Error("Active workflow not found");
        return workflowResult("Workflow exported", {
          clipboardText: JSON.stringify(workflow, null, 2),
        });
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.run-active",
        group: "workflow",
        label: "Run Active Workflow",
        description: "Run the active workflow",
        keywords: ["execute workflow", "test", "run"],
        icon: "play",
        payloadSchema: runPayloadSchema,
        availability: activeAvailability(context),
      }),
      execute: async (context, payload) => {
        const workflow = activeWorkflow(context);
        if (!workflow) throw new Error("Active workflow not found");
        const { triggerPayload, executionId } = payload as z.infer<typeof runPayloadSchema>;
        const execId =
          executionId ?? `exec_cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await workflowServices(context).executeWorkflow(workflow, triggerPayload ?? {}, execId);
        return workflowResult("Workflow run started", {
          uiIntent: { type: "workflow.execution.open", payload: { executionId: execId } },
        });
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.stop-running",
        group: "workflow",
        label: "Stop Running Workflow",
        description: "Request cancellation for the active execution",
        keywords: ["cancel execution", "stop workflow"],
        icon: "square",
        payloadSchema: stopPayloadSchema,
        availability:
          context.activeExecutionId || context.activeWorkflowId
            ? { enabled: true }
            : { enabled: false, reason: "No active execution" },
      }),
      execute: (context, payload) => {
        const { executionId } = payload as z.infer<typeof stopPayloadSchema>;
        const targetExecutionId = executionId || context.activeExecutionId;
        if (!targetExecutionId) throw new Error("No execution id supplied");
        workflowServices(context).cancelExecution(targetExecutionId);
        return workflowResult("Workflow stop requested", {
          refreshHints: ["executions"],
        });
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.settings.open",
        group: "workflow",
        label: "Open Workflow Settings",
        description: "Open the active workflow settings panel",
        keywords: ["workflow settings", "details"],
        icon: "settings",
        availability: activeAvailability(context),
      }),
      execute: () => workflowResult("Workflow settings opened", {
        uiIntent: { type: "workflow-settings.open" },
      }),
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.logs.open",
        group: "workflow",
        label: "Open Workflow Logs",
        description: "Open the active workflow logs panel",
        keywords: ["workflow logs", "executions", "history"],
        icon: "scroll-text",
        availability: activeAvailability(context),
      }),
      execute: () => workflowResult("Workflow logs opened", {
        uiIntent: { type: "workflow-logs.open" },
      }),
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.copy-id",
        group: "utility",
        label: "Copy Workflow ID",
        description: "Copy the active workflow id",
        keywords: ["copy id", "workflow id"],
        icon: "copy",
        availability: activeAvailability(context),
      }),
      execute: (context) => workflowResult("Workflow ID copied", {
        clipboardText: context.activeWorkflowId,
      }),
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.copy-webhook-url",
        group: "utility",
        label: "Copy Webhook URL",
        description: "Copy the active workflow webhook URL",
        keywords: ["webhook url", "copy webhook", "plugin webhook"],
        icon: "link",
        availability: webhookAvailability(context),
      }),
      execute: (context) => {
        const workflow = activeWorkflow(context);
        const url = workflow ? buildWebhookUrl(workflow, workflowServices(context)) : null;
        if (!url) throw new Error("Active workflow does not expose a webhook URL");
        return workflowResult("Webhook URL copied", { clipboardText: url });
      },
    },
    {
      describe: (context): CommandDescriptor => ({
        id: "workflow.copy-form-url",
        group: "utility",
        label: "Copy Form URL",
        description: "Copy the active workflow form URL",
        keywords: ["form url", "copy form"],
        icon: "clipboard-list",
        availability: formAvailability(context),
      }),
      execute: (context) => {
        const workflow = activeWorkflow(context);
        const url = workflow ? buildFormUrl(workflow, workflowServices(context)) : null;
        if (!url) throw new Error("Active workflow does not expose a form URL");
        return workflowResult("Form URL copied", { clipboardText: url });
      },
    },
  ];
}

export const workflowsCommandProvider: CommandProvider = {
  id: "workflows",
  order: 30,
  commands: (context: CommandExecutionContext) => {
    return [
      createWorkflowCommand(),
      importWorkflowCommand(),
      ...activeWorkflowCommands(),
      ...openWorkflowCommands(context),
    ];
  },
};
