import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandExecutionResult,
} from "../modules/command-palette/command-types.ts";
import { CommandExecutor, CommandExecutionError } from "../modules/command-palette/command-executor.ts";
import { CommandRegistry } from "../modules/command-palette/command-registry.ts";
import { searchCommands } from "../modules/command-palette/command-search.ts";
import { appSettingsCommandProvider } from "../modules/command-palette/providers/app-settings.commands.ts";
import { navigationCommandProvider } from "../modules/command-palette/providers/navigation.commands.ts";
import { pluginsCommandProvider } from "../modules/command-palette/providers/plugins.commands.ts";
import { workflowsCommandProvider } from "../modules/command-palette/providers/workflows.commands.ts";

interface CommandPaletteRouteOptions {
  registry?: CommandRegistry;
}

type PublicCommandDescriptor = Omit<CommandDescriptor, "payloadSchema">;

const defaultRegistry = new CommandRegistry();
defaultRegistry.registerProvider(navigationCommandProvider);
defaultRegistry.registerProvider(appSettingsCommandProvider);
defaultRegistry.registerProvider(workflowsCommandProvider);
defaultRegistry.registerProvider(pluginsCommandProvider);

function sendResponse<T>(reply: FastifyReply, response: ApiResponse<T>) {
  return reply.code(response.status_code).send(response);
}

function serializeCommand(command: CommandDescriptor): PublicCommandDescriptor {
  const { payloadSchema: _payloadSchema, ...publicCommand } = command;
  return publicCommand;
}

function booleanFromQuery(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function stringFromQuery(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function createContext(input: Partial<CommandExecutionContext> = {}): CommandExecutionContext {
  return { services: {}, ...input };
}

function createContextFromRequest(req: FastifyRequest): CommandExecutionContext {
  const query = req.query as Record<string, unknown>;
  const body = req.body as { context?: Partial<CommandExecutionContext> } | undefined;
  const bodyContext =
    body && typeof body === "object" && "context" in body ? (body.context ?? {}) : {};

  return createContext({
    ...bodyContext,
    routePath: bodyContext.routePath ?? stringFromQuery(query.routePath),
    activeWorkflowId: bodyContext.activeWorkflowId ?? stringFromQuery(query.activeWorkflowId),
    activeExecutionId: bodyContext.activeExecutionId ?? stringFromQuery(query.activeExecutionId),
    isUniverseMode: bodyContext.isUniverseMode ?? booleanFromQuery(query.isUniverseMode),
  });
}

function commandPayloadFromRequest(req: FastifyRequest): unknown {
  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body === "object" && ("payload" in body || "context" in body)) {
    return body.payload ?? {};
  }
  return req.body;
}

export default async function commandPaletteRoutes(
  fastify: FastifyInstance,
  options: CommandPaletteRouteOptions = {},
) {
  const registry = options.registry ?? defaultRegistry;
  const executor = new CommandExecutor(registry);

  fastify.get("/command-palette/commands", async (req, reply) => {
    try {
      const commands = await registry.list(createContextFromRequest(req));
      return sendResponse(reply, {
        status_code: 200,
        message: "Command palette commands fetched successfully",
        error: null,
        data: commands.map(serializeCommand),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch command palette commands",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.get("/command-palette/search", async (req, reply) => {
    const { q = "" } = req.query as { q?: string };

    try {
      const commands = await registry.list(createContextFromRequest(req));
      const results = searchCommands(q, commands).map((result) => serializeCommand(result.command));
      return sendResponse(reply, {
        status_code: 200,
        message: "Command palette search completed successfully",
        error: null,
        data: results,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to search command palette commands",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.post("/command-palette/commands/:commandId/execute", async (req, reply) => {
    const { commandId } = req.params as { commandId: string };

    try {
      const result = await executor.execute(
        commandId,
        createContextFromRequest(req),
        commandPayloadFromRequest(req),
      );
      return sendResponse<CommandExecutionResult>(reply, {
        status_code: 200,
        message: result.message ?? "Command executed successfully",
        error: null,
        data: result,
      });
    } catch (error: any) {
      const statusCode = error instanceof CommandExecutionError ? error.statusCode : 500;
      return sendResponse(reply, {
        status_code: statusCode,
        message: "Failed to execute command",
        error: error.message,
        data: null,
      });
    }
  });
}
