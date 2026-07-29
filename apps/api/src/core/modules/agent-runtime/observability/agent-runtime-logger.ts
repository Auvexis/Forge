import { sanitizeAgentEventPayload } from "../agent-event-sanitizer.ts";
import type {
  AgentRuntimeLogContext,
  AgentRuntimeLogEntry,
  AgentRuntimeLogEvent,
  AgentRuntimeLogLevel,
} from "./agent-runtime-log-contracts.ts";

const PREFIX = "[FABRIC | AGENT]";
const LEVEL_WEIGHT: Record<AgentRuntimeLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class AgentRuntimeLogger {
  constructor(private readonly context: AgentRuntimeLogContext) {}

  child(context: Partial<AgentRuntimeLogContext>): AgentRuntimeLogger {
    return new AgentRuntimeLogger({ ...this.context, ...context });
  }

  debug(event: AgentRuntimeLogEvent, data?: Record<string, unknown>): void {
    this.write("debug", event, data);
  }

  info(event: AgentRuntimeLogEvent, data?: Record<string, unknown>): void {
    this.write("info", event, data);
  }

  warn(event: AgentRuntimeLogEvent, data?: Record<string, unknown>): void {
    this.write("warn", event, data);
  }

  error(event: AgentRuntimeLogEvent, data?: Record<string, unknown>): void {
    this.write("error", event, data);
  }

  private write(
    level: AgentRuntimeLogLevel,
    event: AgentRuntimeLogEvent,
    data?: Record<string, unknown>,
  ): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel()]) return;

    const entry: AgentRuntimeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      context: this.context,
      ...(data ? { data: sanitizeAgentEventPayload(data) as Record<string, unknown> } : {}),
    };
    console[level](`${PREFIX} ${JSON.stringify(entry)}`);
  }
}

function configuredLevel(): AgentRuntimeLogLevel {
  const configured = process.env.FABRIC_AGENT_LOG_LEVEL?.toLowerCase();
  return configured === "debug" ||
      configured === "info" ||
      configured === "warn" ||
      configured === "error"
    ? configured
    : "info";
}
