import { ZodError } from "zod";
import type { CommandExecutionContext, CommandExecutionResult } from "./command-types.ts";
import { CommandRegistry } from "./command-registry.ts";

export class CommandExecutionError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "CommandExecutionError";
  }
}

export class CommandExecutor {
  constructor(private readonly registry: CommandRegistry) {}

  async execute(
    commandId: string,
    context: CommandExecutionContext,
    payload?: unknown,
  ): Promise<CommandExecutionResult> {
    const entry = await this.registry.find(commandId, context);

    if (!entry) {
      throw new CommandExecutionError("Command not found", 404);
    }

    const { descriptor, handler } = entry;
    if (!descriptor.availability.enabled) {
      throw new CommandExecutionError(
        `Command disabled: ${descriptor.availability.reason ?? "Unavailable"}`,
        400,
      );
    }

    let parsedPayload = payload;
    if (descriptor.payloadSchema) {
      try {
        parsedPayload = descriptor.payloadSchema.parse(payload);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CommandExecutionError(`Invalid command payload: ${error.message}`, 400);
        }
        throw error;
      }
    }

    return handler.execute(context, parsedPayload);
  }
}
