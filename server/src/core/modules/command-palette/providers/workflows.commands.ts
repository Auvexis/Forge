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
  CommandDrilldown,
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

const workflowPickPayloadSchema = z.object({
  workflowId: z.string().trim().min(1),
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

function exposesWebhookUrl(workflow: WorkflowItem): boolean {
  return workflow.trigger.type === "webhook" || workflow.trigger.type === "plugin";
}

function webhookAvailability(context: CommandExecutionContext) {
  const workflow = activeWorkflow(context);
  if (!workflow) return { enabled: false, reason: "Active workflow not found" };
  return exposesWebhookUrl(workflow)
    ? { enabled: true }
    : { enabled: false, reason: "Active workflow does not expose a webhook URL" };
}

function formAvailability(context: CommandExecutionContext) {
  const workflow = activeWorkflow(context);
  if (!workflow) return { enabled: false, reason: "Active workflow not found" };
  return exposesFormUrl(workflow)
    ? { enabled: true }
    : { enabled: false, reason: "Active workflow does not expose a form URL" };
}

function buildFormUrl(workflow: WorkflowItem, services: WorkflowCommandServices): string | null {
  if (workflow.trigger.type !== "form") return null;
  const formId = workflow.trigger.formSlug?.trim() || workflow.metadata.id;
  return `${services.getPublicUrl().replace(/\/$/, "")}/forms/${formId}`;
}

function exposesFormUrl(workflow: WorkflowItem): boolean {
  return workflow.trigger.type === "form";
}

// ─── Drilldown helpers ──────────────────────────────────────────────────────

function workflowListDrilldown(
  context: CommandExecutionContext,
  title: string,
): CommandDrilldown {
  const workflows = workflowServices(context).listWorkflows();
  return {
    type: "list",
    title,
    commands: workflows.map((wf) => ({
      id: `_pick.${wf.metadata.id}`,
      group: "workflow" as const,
      label: wf.metadata.name,
      description: wf.metadata.id,
      keywords: [wf.metadata.id, wf.metadata.name],
      icon: "workflow",
      availability: { enabled: true },
    })),
  };
}

// ─── Commands ────────────────────────────────────────────────────────────────

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
    execute: () => ({
      ok: true,
      drilldown: {
        type: "input",
        title: "New workflow name",
        placeholder: "My awesome workflow…",
        targetCommandId: "workflow.create.named",
        payloadKey: "name",
      },
    }),
  };
}

function createNamedWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.create.named",
      group: "workflow",
      label: "Create Named Workflow",
      description: "Internal: creates a workflow with a given name",
      keywords: [],
      icon: "plus",
      availability: { enabled: true, hidden: true },
    }),
    execute: (context, payload) => {
      const { name } = renamePayloadSchema.parse(payload);
      const services = workflowServices(context);
      const draft = createDraftWorkflow();
      const workflow = services.saveWorkflow(
        withUpdatedWorkflow({ ...draft, metadata: { ...draft.metadata, name } }),
      );
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

// ── Open workflow ─────────────────────────────────────────────────────────────

function openWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.open",
      group: "workflow",
      label: "Open Workflow",
      description: "Choose a workflow to open",
      keywords: ["open workflow", "switch workflow", "go to workflow"],
      icon: "workflow",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Open Workflow"),
    }),
  };
}

function openWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.open.picked",
      group: "workflow",
      label: "Open Selected Workflow",
      keywords: [],
      icon: "workflow",
      availability: { enabled: true, hidden: true },
    }),
    execute: (_context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      return { ok: true, message: "Workflow opened", navigation: { path: `/workflows/${workflowId}` } };
    },
  };
}

// ── Delete workflow ───────────────────────────────────────────────────────────

function deleteWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.delete",
      group: "workflow",
      label: "Delete Workflow",
      description: "Choose a workflow to delete",
      keywords: ["remove workflow", "delete"],
      icon: "trash",
      destructive: true,
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Delete Workflow"),
    }),
  };
}

function deleteWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.delete.picked",
      group: "workflow",
      label: "Delete Selected Workflow",
      keywords: [],
      icon: "trash",
      destructive: true,
      availability: { enabled: true, hidden: true },
    }),
    execute: async (context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      const services = workflowServices(context);
      const wf = services.getWorkflowById(workflowId);
      if (!wf) throw new Error("Workflow not found");
      services.deleteWorkflowExecutions(workflowId);
      services.deleteWorkflow(workflowId);
      services.resyncScheduler();
      await services.deactivateWorkflow(wf);
      const isActive = context.activeWorkflowId === workflowId;
      return workflowResult("Workflow deleted", {
        navigation: isActive ? { path: "/workflows" } : undefined,
      });
    },
  };
}

// ── Rename workflow ───────────────────────────────────────────────────────────

function renameWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.rename",
      group: "workflow",
      label: "Rename Workflow",
      description: "Choose a workflow to rename",
      keywords: ["rename workflow", "title"],
      icon: "pencil",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Rename Workflow"),
    }),
  };
}

/** Internal: after pick → show input for new name, storing workflowId in title */
function renameWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.rename.picked",
      group: "workflow",
      label: "Rename Selected Workflow",
      keywords: [],
      icon: "pencil",
      availability: { enabled: true, hidden: true },
    }),
    execute: (_context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      return {
        ok: true,
        drilldown: {
          type: "input",
          title: "New name",
          placeholder: "Workflow name…",
          targetCommandId: "workflow.rename.commit",
          payloadKey: "name",
          // Pass workflowId through as part of payload via title context — stored in store
          // The host will merge `drilldownContext.workflowId` into the payload.
          // We embed it in targetCommandId as a query param pattern instead:
          // The frontend host merges `drilldownContext` (set here in extra payload) into next execute call.
        } as CommandDrilldown,
        // Signal host to remember workflowId for the next step
        refreshHints: [`_drilldown_ctx:workflowId=${workflowId}`],
      };
    },
  };
}

function renameWorkflowCommitCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.rename.commit",
      group: "workflow",
      label: "Commit Workflow Rename",
      keywords: [],
      icon: "pencil",
      availability: { enabled: true, hidden: true },
    }),
    execute: (context, payload) => {
      const { name, workflowId } = (payload ?? {}) as { name?: string; workflowId?: string };
      if (!name?.trim()) throw new Error("Name is required");
      const id = workflowId || context.activeWorkflowId;
      if (!id) throw new Error("No workflow selected");
      const services = workflowServices(context);
      const wf = services.getWorkflowById(id);
      if (!wf) throw new Error("Workflow not found");
      services.saveWorkflow(withUpdatedWorkflow({ ...wf, metadata: { ...wf.metadata, name: name.trim() } }));
      return workflowResult("Workflow renamed");
    },
  };
}

// ── Publish / Unpublish ───────────────────────────────────────────────────────

function publishWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.publish",
      group: "workflow",
      label: "Publish Workflow",
      description: "Choose a workflow to publish",
      keywords: ["publish", "activate", "production"],
      icon: "rocket",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Publish Workflow"),
    }),
  };
}

function publishWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.publish.picked",
      group: "workflow",
      label: "Publish Selected Workflow",
      keywords: [],
      icon: "rocket",
      availability: { enabled: true, hidden: true },
    }),
    execute: async (context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      const services = workflowServices(context);
      const wf = services.publishWorkflow(workflowId);
      if (!wf) throw new Error("Workflow not found");
      services.resyncScheduler();
      await services.activateWorkflow(wf);
      return workflowResult("Workflow published");
    },
  };
}

function unpublishWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.unpublish",
      group: "workflow",
      label: "Unpublish Workflow",
      description: "Choose a workflow to unpublish",
      keywords: ["unpublish", "deactivate"],
      icon: "pause",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Unpublish Workflow"),
    }),
  };
}

function unpublishWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.unpublish.picked",
      group: "workflow",
      label: "Unpublish Selected Workflow",
      keywords: [],
      icon: "pause",
      availability: { enabled: true, hidden: true },
    }),
    execute: async (context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      const services = workflowServices(context);
      const before = services.getWorkflowById(workflowId);
      const wf = services.unpublishWorkflow(workflowId);
      if (!wf) throw new Error("Workflow not found");
      services.resyncScheduler();
      if (before) await services.deactivateWorkflow(before);
      return workflowResult("Workflow unpublished");
    },
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.export",
      group: "workflow",
      label: "Export Workflow",
      description: "Choose a workflow to export as JSON",
      keywords: ["export workflow", "json", "download"],
      icon: "download",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Export Workflow"),
    }),
  };
}

function exportWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.export.picked",
      group: "workflow",
      label: "Export Selected Workflow",
      keywords: [],
      icon: "download",
      availability: { enabled: true, hidden: true },
    }),
    execute: (context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      const wf = workflowServices(context).getWorkflowById(workflowId);
      if (!wf) throw new Error("Workflow not found");
      return workflowResult("Workflow exported", { clipboardText: JSON.stringify(wf, null, 2) });
    },
  };
}

// ── Logs ──────────────────────────────────────────────────────────────────────

function openWorkflowLogsCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.logs.open",
      group: "workflow",
      label: "Open Workflow Logs",
      description: "Choose a workflow to view its execution logs",
      keywords: ["workflow logs", "executions", "history"],
      icon: "scroll-text",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Open Workflow Logs"),
    }),
  };
}

function openWorkflowLogsPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.logs.open.picked",
      group: "workflow",
      label: "Open Logs for Selected Workflow",
      keywords: [],
      icon: "scroll-text",
      availability: { enabled: true, hidden: true },
    }),
    execute: (_context, payload) => {
      const { workflowId } = workflowPickPayloadSchema.parse(payload);
      return {
        ok: true,
        message: "Workflow logs opened",
        uiIntent: { type: "workflow-logs.open", target: workflowId },
      };
    },
  };
}

// ── Run / Stop ────────────────────────────────────────────────────────────────

function runWorkflowCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.run",
      group: "workflow",
      label: "Run Workflow",
      description: "Choose a workflow to run",
      keywords: ["execute workflow", "test", "run", "trigger"],
      icon: "play",
      availability: { enabled: true },
    }),
    execute: (context) => ({
      ok: true,
      drilldown: workflowListDrilldown(context, "Run Workflow"),
    }),
  };
}

function runWorkflowPickedCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "workflow.run.picked",
      group: "workflow",
      label: "Run Selected Workflow",
      keywords: [],
      icon: "play",
      payloadSchema: runPayloadSchema.extend({ workflowId: z.string().min(1) }),
      availability: { enabled: true, hidden: true },
    }),
    execute: async (context, payload) => {
      const { workflowId, triggerPayload, executionId } = (payload ?? {}) as {
        workflowId: string;
        triggerPayload?: Record<string, unknown>;
        executionId?: string;
      };
      const services = workflowServices(context);
      const wf = services.getWorkflowById(workflowId);
      if (!wf) throw new Error("Workflow not found");
      const execId = executionId ?? `exec_cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await services.executeWorkflow(wf, triggerPayload ?? {}, execId);
      return workflowResult("Workflow run started", {
        uiIntent: { type: "workflow.execution.open", payload: { executionId: execId } },
      });
    },
  };
}

function stopWorkflowCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: "workflow.stop",
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
  };
}

// ── Active-workflow commands (still useful when already in editor) ─────────────

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
        id: "workflow.variables.open",
        group: "workflow",
        label: "Open Workflow Variables",
        description: "Open the active workflow variables modal",
        keywords: ["workflow variables", "vars", "environment", "secret"],
        icon: "tags",
        availability: activeAvailability(context),
      }),
      execute: () => workflowResult("Workflow variables opened", {
        uiIntent: { type: "workflow-variables.open" },
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
  commands: (_context: CommandExecutionContext) => [
    createWorkflowCommand(),
    createNamedWorkflowCommand(),
    importWorkflowCommand(),
    openWorkflowCommand(),
    openWorkflowPickedCommand(),
    deleteWorkflowCommand(),
    deleteWorkflowPickedCommand(),
    renameWorkflowCommand(),
    renameWorkflowPickedCommand(),
    renameWorkflowCommitCommand(),
    publishWorkflowCommand(),
    publishWorkflowPickedCommand(),
    unpublishWorkflowCommand(),
    unpublishWorkflowPickedCommand(),
    exportWorkflowCommand(),
    exportWorkflowPickedCommand(),
    openWorkflowLogsCommand(),
    openWorkflowLogsPickedCommand(),
    runWorkflowCommand(),
    runWorkflowPickedCommand(),
    stopWorkflowCommand(),
    ...activeWorkflowCommands(),
  ],
};
