import { AgentRunner } from "./agent-runner.ts";
import type { AgentRunInput, AgentRunResult } from "./agent-types.ts";
import type { FabricAgentToolDefinition } from "./plugin-tool-adapter.ts";
import { WorkflowRepository } from "../workflows/repository.ts";
import { AgentRuntimeStateStore } from "./persistence/agent-runtime-state-store.ts";
import path from "node:path";
import { fabricHomePaths } from "../../runtime/fabric-home.ts";
import { AgentArtifactRepository } from "./artifacts/agent-artifact-repository.ts";
import { AgentArtifactService } from "./artifacts/agent-artifact-service.ts";
import { AgentArtifactStorage } from "./artifacts/agent-artifact-storage.ts";
import { AgentSideEffectRepository } from "./idempotency/agent-side-effect-repository.ts";
import { AgentSideEffectService } from "./idempotency/agent-side-effect-service.ts";

const defaultRunner = new AgentRunner({
  stateStoreFactory: () => new AgentRuntimeStateStore(WorkflowRepository.database()),
  artifactServiceFactory: () => new AgentArtifactService(
    new AgentArtifactRepository(WorkflowRepository.database()),
    new AgentArtifactStorage(path.join(fabricHomePaths.dataDir, "agent-artifacts")),
  ),
  sideEffectServiceFactory: () => new AgentSideEffectService(
    new AgentSideEffectRepository(WorkflowRepository.database()),
  ),
});

export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    return defaultRunner.run(input);
  },

  listTools(): FabricAgentToolDefinition[] {
    return defaultRunner.listTools();
  },
};
