import { AgentRunner } from "./agent-runner.ts";
import type { AgentRunInput, AgentRunResult } from "./agent-types.ts";
import type { FabricAgentToolDefinition } from "./plugin-tool-adapter.ts";
import { WorkflowRepository } from "../workflows/repository.ts";
import { AgentRuntimeStateStore } from "./persistence/agent-runtime-state-store.ts";

const defaultRunner = new AgentRunner({
  stateStoreFactory: () => new AgentRuntimeStateStore(WorkflowRepository.database()),
});

export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    return defaultRunner.run(input);
  },

  listTools(): FabricAgentToolDefinition[] {
    return defaultRunner.listTools();
  },
};
