import { AppRepository } from "../../app/app-repository.ts";
import { CancellationRegistry } from "../../workflows/cancellation-registry.ts";
import { WorkflowRepository } from "../../workflows/repository.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandHandler,
  CommandProvider,
} from "../command-types.ts";

interface ExecutionCommandServices {
  getWorkflowById: (workflowId: string) => WorkflowItem | null;
  deleteWorkflowExecutions: (workflowId: string) => void;
  cancelExecution: (executionId: string) => void;
  getPublicUrl: () => string;
  getSetting: (key: string) => unknown | null;
  setSetting: (key: string, value: unknown) => void;
}

function resolvePublicUrl(): string {
  const configured = AppRepository.getSetting("public_url");
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 23801}`;
}

const defaultExecutionServices: ExecutionCommandServices = {
  getWorkflowById: WorkflowRepository.getWorkflowById,
  deleteWorkflowExecutions: WorkflowRepository.deleteWorkflowExecutions,
  cancelExecution: CancellationRegistry.cancel,
  getPublicUrl: resolvePublicUrl,
  getSetting: AppRepository.getSetting.bind(AppRepository),
  setSetting: AppRepository.setSetting.bind(AppRepository),
};

function executionServices(context: CommandExecutionContext): ExecutionCommandServices {
  return {
    ...defaultExecutionServices,
    ...((context.services?.executions as Partial<ExecutionCommandServices> | undefined) ?? {}),
  };
}

function activeWorkflow(context: CommandExecutionContext): WorkflowItem | null {
  if (!context.activeWorkflowId) return null;
  return executionServices(context).getWorkflowById(context.activeWorkflowId);
}

function activeWorkflowAvailability(context: CommandExecutionContext) {
  if (!context.activeWorkflowId) return { enabled: false, reason: "No active workflow" };
  if (!activeWorkflow(context)) return { enabled: false, reason: "Active workflow not found" };
  return { enabled: true };
}

function activeExecutionAvailability(context: CommandExecutionContext) {
  return context.activeExecutionId
    ? { enabled: true }
    : { enabled: false, reason: "No active execution" };
}

function publicBaseUrl(context: CommandExecutionContext): string {
  return executionServices(context).getPublicUrl().replace(/\/$/, "");
}

function webhookUrl(workflow: WorkflowItem, context: CommandExecutionContext): string | null {
  if (workflow.trigger.type !== "webhook" && workflow.trigger.type !== "plugin") return null;
  const path = workflow.trigger.webhookSlug || workflow.trigger.webhookPath || workflow.metadata.id;
  return `${publicBaseUrl(context)}/webhook/${path}`;
}

function formUrl(workflow: WorkflowItem, context: CommandExecutionContext): string | null {
  if (workflow.trigger.type !== "form") return null;
  const formId = workflow.trigger.formSlug?.trim() || workflow.metadata.id;
  return `${publicBaseUrl(context)}/forms/${formId}`;
}

function logsOpenCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: "execution.logs.open",
      group: "execution",
      label: "Open Executions",
      description: "Open execution logs for the active workflow",
      keywords: ["logs", "executions", "history", "workflow logs"],
      icon: "scroll-text",
      availability: activeWorkflowAvailability(context),
    }),
    execute: (context) => ({
      ok: true,
      message: "Workflow logs opened",
      uiIntent: { type: "workflow-logs.open", target: context.activeWorkflowId },
    }),
  };
}

function clearLogsCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: "execution.logs.clear",
      group: "execution",
      label: "Clear Workflow Logs",
      description: "Clear execution history for the active workflow",
      keywords: ["clear logs", "delete executions", "history"],
      icon: "trash",
      destructive: true,
      availability: activeWorkflowAvailability(context),
    }),
    execute: (context) => {
      if (!context.activeWorkflowId) throw new Error("No active workflow");
      executionServices(context).deleteWorkflowExecutions(context.activeWorkflowId);
      return {
        ok: true,
        message: "Workflow logs cleared",
        refreshHints: ["executions"],
      };
    },
  };
}

function stopExecutionCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: "execution.stop-running",
      group: "execution",
      label: "Stop Running Execution",
      description: "Request cancellation for the active execution",
      keywords: ["stop execution", "cancel execution", "running"],
      icon: "square",
      availability: activeExecutionAvailability(context),
    }),
    execute: (context) => {
      if (!context.activeExecutionId) throw new Error("No active execution");
      executionServices(context).cancelExecution(context.activeExecutionId);
      return {
        ok: true,
        message: "Execution stop requested",
        refreshHints: ["executions"],
      };
    },
  };
}

function unavailableDeleteExecutionCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "execution.delete",
      group: "execution",
      label: "Delete Execution",
      description: "Disabled until a generic individual execution delete endpoint exists",
      keywords: ["delete execution", "remove log"],
      icon: "trash",
      destructive: true,
      availability: {
        enabled: false,
        reason: "No generic individual execution delete endpoint exists yet",
      },
    }),
    execute: () => ({ ok: false, message: "Execution delete is not available" }),
  };
}

function copyWorkflowIdCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => ({
      id: "utility.copy-workflow-id",
      group: "utility",
      label: "Copy Workflow ID",
      description: "Copy the active workflow id",
      keywords: ["copy", "workflow id"],
      icon: "copy",
      availability: activeWorkflowAvailability(context),
    }),
    execute: (context) => ({
      ok: true,
      message: "Workflow ID copied",
      clipboardText: context.activeWorkflowId,
    }),
  };
}

function copyWebhookUrlCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => {
      const workflow = activeWorkflow(context);
      const url = workflow ? webhookUrl(workflow, context) : null;
      return {
        id: "utility.copy-webhook-url",
        group: "utility",
        label: "Copy Webhook URL",
        description: "Copy the active workflow webhook URL",
        keywords: ["copy", "webhook url", "plugin webhook"],
        icon: "link",
        availability: url
          ? { enabled: true }
          : { enabled: false, reason: "Active workflow does not expose a webhook URL" },
      };
    },
    execute: (context) => {
      const workflow = activeWorkflow(context);
      const url = workflow ? webhookUrl(workflow, context) : null;
      if (!url) throw new Error("Active workflow does not expose a webhook URL");
      return { ok: true, message: "Webhook URL copied", clipboardText: url };
    },
  };
}

function copyFormUrlCommand(): CommandHandler {
  return {
    describe: (context): CommandDescriptor => {
      const workflow = activeWorkflow(context);
      const url = workflow ? formUrl(workflow, context) : null;
      return {
        id: "utility.copy-form-url",
        group: "utility",
        label: "Copy Form URL",
        description: "Copy the active workflow form URL",
        keywords: ["copy", "form url"],
        icon: "clipboard-list",
        availability: url
          ? { enabled: true }
          : { enabled: false, reason: "Active workflow does not expose a form URL" },
      };
    },
    execute: (context) => {
      const workflow = activeWorkflow(context);
      const url = workflow ? formUrl(workflow, context) : null;
      if (!url) throw new Error("Active workflow does not expose a form URL");
      return { ok: true, message: "Form URL copied", clipboardText: url };
    },
  };
}

function toggleThemeCommand(): CommandHandler {
  return {
    describe: (): CommandDescriptor => ({
      id: "utility.theme.toggle",
      group: "utility",
      label: "Toggle Theme",
      description: "Toggle between dark and light theme",
      keywords: ["theme", "dark", "light", "mode"],
      icon: "sun-moon",
      availability: { enabled: true },
    }),
    execute: () => ({
      ok: true,
      message: "Theme toggled",
      uiIntent: { type: "theme.toggle" },
    }),
  };
}

export const executionsCommandProvider: CommandProvider = {
  id: "executions",
  order: 50,
  commands: [
    logsOpenCommand(),
    clearLogsCommand(),
    stopExecutionCommand(),
    unavailableDeleteExecutionCommand(),
    copyWorkflowIdCommand(),
    copyWebhookUrlCommand(),
    copyFormUrlCommand(),
    toggleThemeCommand(),
  ],
};
