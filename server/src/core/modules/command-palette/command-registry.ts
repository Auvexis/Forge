import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandHandler,
  CommandProvider,
} from "./command-types.ts";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKeyword(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeCommandDescriptor(command: CommandDescriptor): CommandDescriptor {
  const keywords = new Set<string>();

  for (const keyword of command.keywords ?? []) {
    const normalized = normalizeKeyword(keyword);
    if (normalized) keywords.add(normalized);
  }

  return {
    ...command,
    id: command.id.trim().toLowerCase(),
    label: normalizeWhitespace(command.label),
    description: command.description ? normalizeWhitespace(command.description) : undefined,
    keywords: [...keywords],
    destructive: command.destructive ?? false,
    availability: {
      ...command.availability,
      hidden: command.availability.hidden ?? false,
    },
  };
}

export function filterVisibleCommands(commands: CommandDescriptor[]): CommandDescriptor[] {
  return commands.filter((command) => command.availability.hidden !== true);
}

export class CommandRegistry {
  private readonly providers = new Map<string, CommandProvider>();

  registerProvider(provider: CommandProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Duplicate command provider "${provider.id}"`);
    }
    this.providers.set(provider.id, provider);
  }

  async list(context: CommandExecutionContext): Promise<CommandDescriptor[]> {
    const commands: CommandDescriptor[] = [];
    const ids = new Set<string>();

    for (const provider of this.orderedProviders()) {
      const providerCommands: Array<{
        handler: CommandHandler;
        descriptor: CommandDescriptor;
      }> = [];

      for (const handler of provider.commands) {
        const descriptor = normalizeCommandDescriptor(await handler.describe(context));
        if (ids.has(descriptor.id)) {
          throw new Error(`Duplicate command id "${descriptor.id}"`);
        }
        ids.add(descriptor.id);
        providerCommands.push({ handler, descriptor });
      }

      providerCommands.sort((a, b) =>
        a.descriptor.label.localeCompare(b.descriptor.label, "en", { sensitivity: "base" }),
      );
      commands.push(...providerCommands.map((entry) => entry.descriptor));
    }

    return filterVisibleCommands(commands);
  }

  private orderedProviders(): CommandProvider[] {
    return [...this.providers.values()].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
    });
  }
}
