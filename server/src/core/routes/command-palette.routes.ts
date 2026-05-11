import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandExecutionResult,
} from "../modules/command-palette/command-types.ts";
import { CommandExecutor, CommandExecutionError } from "../modules/command-palette/command-executor.ts";
import { CommandRegistry } from "../modules/command-palette/command-registry.ts";
import { searchCommands } from "../modules/command-palette/command-search.ts";

interface CommandPaletteRouteOptions {
  registry?: CommandRegistry;
}

type PublicCommandDescriptor = Omit<CommandDescriptor, "payloadSchema">;

const defaultRegistry = new CommandRegistry();

function sendResponse<T>(reply: FastifyReply, response: ApiResponse<T>) {
  return reply.code(response.status_code).send(response);
}

function serializeCommand(command: CommandDescriptor): PublicCommandDescriptor {
  const { payloadSchema: _payloadSchema, ...publicCommand } = command;
  return publicCommand;
}

function createContext(input: Partial<CommandExecutionContext> = {}): CommandExecutionContext {
  return input;
}

export default async function commandPaletteRoutes(
  fastify: FastifyInstance,
  options: CommandPaletteRouteOptions = {},
) {
  const registry = options.registry ?? defaultRegistry;
  const executor = new CommandExecutor(registry);

  fastify.get("/command-palette/commands", async (_req, reply) => {
    try {
      const commands = await registry.list(createContext());
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
      const commands = await registry.list(createContext());
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
      const result = await executor.execute(commandId, createContext(), req.body);
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
