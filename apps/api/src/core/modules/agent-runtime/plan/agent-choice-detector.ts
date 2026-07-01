import type { AgentPlanTool } from "./agent-plan-types.ts";

export interface DetectAgentChoiceInput {
  tool: Pick<AgentPlanTool, "name" | "selection">;
  result: unknown;
}

export interface AgentChoiceOutput {
  status: "waiting-user";
  reason: "ambiguous_result";
  question: string;
  repeatedTool: string;
  options: Array<{
    label: string;
    value: unknown;
    item: unknown;
  }>;
}

export function detectAgentChoice(input: DetectAgentChoiceInput): AgentChoiceOutput | null {
  const selection = input.tool.selection;
  if (!selection) return null;

  const selected = readPath(input.result, selection.path);
  if (!Array.isArray(selected) || selected.length <= 1) return null;

  return {
    status: "waiting-user",
    reason: "ambiguous_result",
    question: "Choose one option to continue.",
    repeatedTool: input.tool.name,
    options: selected.map((item) => ({
      label: labelForItem(item, selection.labelFields),
      value: fieldValue(item, selection.valueField),
      item,
    })),
  };
}

function readPath(value: unknown, path: string): unknown {
  if (path === "$") return value;
  const parts = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  return parts.reduce((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
}

function labelForItem(item: unknown, fields: string[]): string {
  if (!item || typeof item !== "object" || Array.isArray(item)) return String(item);
  const record = item as Record<string, unknown>;
  const values = fields
    .map((field) => record[field])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map(String)
    .filter(Boolean);
  return values.join(" - ") || JSON.stringify(item);
}

function fieldValue(item: unknown, field: string): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  return (item as Record<string, unknown>)[field];
}
