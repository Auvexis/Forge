import { AgentRuntimeError } from "./agent-errors.ts";
import type { AgentGraphMessage } from "./agent-graph-builder.ts";

export function toAgentRuntimeModel(model: unknown) {
  const candidate = model as {
    routeIntent?: (input: { messages: any[]; schema: Record<string, any>; signal?: AbortSignal }) => Promise<unknown>;
    generatePlan?: (input: { messages: any[]; schema: Record<string, any> }) => Promise<any>;
    repairPlanStep?: (input: { messages: any[] }, schema?: Record<string, any>) => Promise<any>;
    generateFinalResponse?: (input: { messages: any[] }) => Promise<string>;
    invoke?: (
      messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>,
      options?: { signal?: AbortSignal },
    ) => Promise<{ content?: unknown } | string>;
    invokeJson?: <T extends object>(
      input: { messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }> },
      schema?: Record<string, any>,
      options?: { signal?: AbortSignal },
    ) => Promise<T>;
  };
  if (typeof candidate.generatePlan !== "function" && typeof candidate.invokeJson !== "function") {
    throw new AgentRuntimeError(
      "Agent model does not support structured plan generation",
      "AGENT_MODEL_PLAN_UNSUPPORTED",
      "Agent model cannot generate a structured tool plan",
      500,
    );
  }

  return {
    routeIntent: async (input: { messages: any[]; schema: Record<string, any>; signal?: AbortSignal }) => {
      if (typeof candidate.routeIntent === "function") return candidate.routeIntent(input);
      if (typeof candidate.invoke === "function") {
        const response = await candidate.invoke(input.messages, { signal: input.signal });
        const content = typeof response === "string" ? response : response?.content;
        return typeof content === "string" ? content : "";
      }
      if (typeof candidate.invokeJson === "function") return candidate.invokeJson(input, input.schema, { signal: input.signal });
      throw new AgentRuntimeError(
        "Agent model does not support intent routing",
        "AGENT_MODEL_INTENT_UNSUPPORTED",
        "Agent model cannot route intent",
        500,
      );
    },
    invokeJson: async <T extends object>(input: { messages: any[]; schema: Record<string, any>; signal?: AbortSignal }): Promise<T> => {
      if (typeof candidate.invokeJson !== "function") {
        throw new AgentRuntimeError(
          "Agent model does not support structured loop decisions",
          "AGENT_MODEL_JSON_UNSUPPORTED",
          "Agent model cannot generate structured loop decisions",
          500,
        );
      }
      return candidate.invokeJson<T>(input, input.schema, { signal: input.signal });
    },
    generatePlan: async (input: { messages: any[]; schema: Record<string, any> }) => {
      try {
        return typeof candidate.generatePlan === "function"
          ? await candidate.generatePlan(input)
          : await candidate.invokeJson!(input, input.schema);
      } catch (error) {
        if (!isInvalidJsonModelError(error) || typeof candidate.invoke !== "function") throw error;
        const response = await candidate.invoke(toTextPlanMessages(input.messages));
        const content = typeof response === "string" ? response : response?.content;
        return parseTextAgentPlan(typeof content === "string" ? content : "");
      }
    },
    repairPlanStep: (input: {
      plan: unknown;
      step: unknown;
      error: unknown;
      outputs: Record<string, unknown>;
      schema: Record<string, any>;
    }) => {
      const messages: AgentGraphMessage[] = [
        { role: "system", content: "Return JSON only with { params }. Repair only the failed tool parameters." },
        { role: "user", content: JSON.stringify(input) },
      ];
      const schema = {
        type: "object",
        required: ["params"],
        properties: { params: { type: "object" } },
      };
      return typeof candidate.repairPlanStep === "function"
        ? candidate.repairPlanStep({ messages }, schema)
        : candidate.invokeJson!({ messages }, schema);
    },
    generateFinalResponse: async (input: { messages: any[] }) => {
      if (typeof candidate.generateFinalResponse === "function") return candidate.generateFinalResponse(input);
      if (typeof candidate.invoke === "function") {
        const response = await candidate.invoke(input.messages);
        if (typeof response === "string") return response;
        return typeof response?.content === "string" ? response.content : "";
      }
      throw new AgentRuntimeError(
        "Agent model does not support final response generation",
        "AGENT_MODEL_FINAL_UNSUPPORTED",
        "Agent model cannot generate a final response",
        500,
      );
    },
  };
}

function isInvalidJsonModelError(error: unknown): boolean {
  return error instanceof AgentRuntimeError && error.code === "AGENT_MODEL_JSON_INVALID";
}

function toTextPlanMessages(messages: any[]): AgentGraphMessage[] {
  const textInstructions = [
    "Structured JSON failed. Generate the same tool plan as plain text.",
    "Use this exact format for each step:",
    "STEP <id>",
    "TOOL <toolName>",
    "PARAM <name>=<value>",
    "REASON <short reason>",
    "ENDSTEP",
    "Use only tools from the catalog above.",
    "Use refs like $steps.search[0].id or $steps.download.download when needed.",
    "Do not add commentary.",
  ].join("\n");

  return [
    ...messages,
    { role: "system", content: textInstructions },
  ] as AgentGraphMessage[];
}

function parseTextAgentPlan(content: string): { steps: Array<{ id: string; toolName: string; params: Record<string, unknown>; reason: string }> } {
  const steps: Array<{ id: string; toolName: string; params: Record<string, unknown>; reason: string }> = [];
  let current: { id: string; toolName: string; params: Record<string, unknown>; reason: string } | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const step = line.match(/^STEP\s+(.+)$/i);
    if (step) {
      if (current) steps.push(current);
      current = { id: sanitizePlanId(step[1]), toolName: "", params: {}, reason: "" };
      continue;
    }

    if (!current) continue;
    const tool = line.match(/^TOOL\s+(.+)$/i);
    if (tool) {
      current.toolName = tool[1].trim();
      continue;
    }

    const param = line.match(/^PARAM\s+([^=\s]+)\s*=\s*(.*)$/i);
    if (param) {
      current.params[param[1].trim()] = parsePlanParamValue(param[2].trim());
      continue;
    }

    const reason = line.match(/^REASON\s+(.+)$/i);
    if (reason) {
      current.reason = reason[1].trim();
      continue;
    }

    if (/^ENDSTEP$/i.test(line)) {
      steps.push(current);
      current = null;
    }
  }

  if (current) steps.push(current);
  return { steps };
}

function sanitizePlanId(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized || "step";
}

function parsePlanParamValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value.replace(/^["']|["']$/g, "");
}
