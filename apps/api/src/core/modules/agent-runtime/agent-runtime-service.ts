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
import { AgentSessionRepository } from "./session/agent-session-repository.ts";
import { AgentSessionWriter } from "./session/agent-session-writer.ts";

const defaultRunner = new AgentRunner({
  stateStoreFactory: () => new AgentRuntimeStateStore(WorkflowRepository.database()),
  artifactServiceFactory: () => new AgentArtifactService(
    new AgentArtifactRepository(WorkflowRepository.database()),
    new AgentArtifactStorage(path.join(fabricHomePaths.dataDir, "agent-artifacts")),
  ),
  sideEffectServiceFactory: () => new AgentSideEffectService(
    new AgentSideEffectRepository(WorkflowRepository.database()),
  ),
  sessionWriterFactory: (input, runId) => {
    if (!input.sessionId) return undefined;
    const repository = new AgentSessionRepository(WorkflowRepository.database());
    const session = repository.getSession(input.profileId, input.sessionId);
    if (!session) throw new Error(`Agent session not found: ${input.sessionId}`);
    const writer = new AgentSessionWriter(
      repository,
      input.profileId,
      input.sessionId,
      session.revision,
    );
    const snapshot = repository.getSnapshot({
      profileId: input.profileId,
      sessionId: input.sessionId,
    });
    const activeTurn = snapshot.activeTurn;
    if (snapshot.pendingInteraction && activeTurn) {
      writer.resolveInteraction(
        snapshot.pendingInteraction,
        input.approvalToken === "approved"
          ? { approved: true }
          : { message: input.userMessage },
      );
      writer.updateTurn(activeTurn.id, "running");
    }
    const turn = activeTurn ?? writer.createTurn({ runId, state: "running" });
    if (!activeTurn) {
      const message = writer.appendMessage(turn.id, "user");
      writer.appendText({
        turnId: turn.id,
        messageId: message.id,
        text: input.userMessage,
      });
    }
    return { writer, turnId: turn.id };
  },
});

export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    return defaultRunner.run(input);
  },

  listTools(): FabricAgentToolDefinition[] {
    return defaultRunner.listTools();
  },
};
