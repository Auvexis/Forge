import type { AiMemoryNodeConfig } from "../agent-types.ts";

export type AgentMemoryMode = "stateless" | "short-term" | "long-term";

export function resolveAgentMemoryMode(memory: AiMemoryNodeConfig | undefined): AgentMemoryMode {
  if (!memory) return "stateless";
  return memory.adapter === "plugin-memory-store" ? "long-term" : "short-term";
}

export function usesShortTermMemory(memory: AiMemoryNodeConfig | undefined): boolean {
  return resolveAgentMemoryMode(memory) === "short-term";
}

export function usesLongTermMemory(memory: AiMemoryNodeConfig | undefined): boolean {
  return resolveAgentMemoryMode(memory) === "long-term";
}
