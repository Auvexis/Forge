import { AgentRunner } from "./agent-runner.ts";
import type { AgentRunInput, AgentRunResult } from "./agent-types.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";

const defaultRunner = new AgentRunner();

export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    return defaultRunner.run(input);
  },

  listTools(): SailorAgentToolDefinition[] {
    return defaultRunner.listTools();
  },
};
