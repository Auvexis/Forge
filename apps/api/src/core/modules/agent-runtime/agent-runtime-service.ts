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
import { AgentEngineRequestRepository } from "./engine-protocol/agent-engine-request-repository.ts";
import { AgentEngineResponseRepository } from "./engine-protocol/agent-engine-response-repository.ts";
import { ConnectedToolNodeResolver } from "./execution/connected-tool-node-resolver.ts";
import { WorkflowEngineToolExecutor } from "./execution/workflow-engine-tool-executor.ts";
import { WorkflowToolScheduler } from "./execution/workflow-tool-scheduler.ts";
import { SideEffectExecutionGuard } from "./execution/side-effect-execution-guard.ts";
import { AgentPendingInteractionRepository } from "./persistence/agent-pending-interaction-repository.ts";
import { AgentEngineRecoveryService } from "./recovery/agent-engine-recovery-service.ts";
import { AgentRuntimeLogger } from "./observability/agent-runtime-logger.ts";

const defaultRunner = new AgentRunner({
  stateStoreFactory: () => new AgentRuntimeStateStore(WorkflowRepository.database()),
  artifactServiceFactory: () => new AgentArtifactService(
    new AgentArtifactRepository(WorkflowRepository.database()),
    new AgentArtifactStorage(path.join(fabricHomePaths.dataDir, "agent-artifacts")),
  ),
  sideEffectServiceFactory: () => new AgentSideEffectService(
    new AgentSideEffectRepository(WorkflowRepository.database()),
  ),
  engineRequestDispatcherFactory: (input) => {
    const workflow = WorkflowRepository.getWorkflowById(input.workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${input.workflowId}`);
    const database = WorkflowRepository.database();
    return new WorkflowToolScheduler(
      new AgentEngineRequestRepository(database),
      new AgentEngineResponseRepository(database),
      new ConnectedToolNodeResolver(workflow, input.nodeId),
      new WorkflowEngineToolExecutor(workflow, input.executionId),
      new SideEffectExecutionGuard(
        input.profileId,
        new AgentSideEffectService(new AgentSideEffectRepository(database)),
      ),
    );
  },
  sessionWriterFactory: (input, runId) => {
    if (!input.sessionId) return undefined;
    const repository = new AgentSessionRepository(WorkflowRepository.database());
    const session = repository.getSession(input.profileId, input.sessionId);
    if (!session) throw new Error(`Agent session not found: ${input.sessionId}`);
    if (session.workflowId !== input.workflowId) {
      throw new Error("Agent session does not belong to the executing workflow");
    }
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
    const commitmentPart = snapshot.messages
      .flatMap((entry) => entry.parts)
      .find((part) =>
        part.type === "commitment" &&
        (!activeTurn || part.turnId === activeTurn.id)
      );
    const turn = activeTurn ?? writer.createTurn({ runId, state: "running" });
    if (!activeTurn) {
      const message = writer.appendMessage(turn.id, "user");
      writer.appendText({
        turnId: turn.id,
        messageId: message.id,
        text: input.userMessage,
      });
    }
    return {
      writer,
      turnId: turn.id,
      ...(snapshot.pendingInteraction
        ? { pendingInteraction: snapshot.pendingInteraction }
        : {}),
      ...(commitmentPart?.type === "commitment" ? { commitmentPart } : {}),
    };
  },
});

export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    return defaultRunner.run(input);
  },

  listTools(): FabricAgentToolDefinition[] {
    return defaultRunner.listTools();
  },

  async recoverPendingEngineWork() {
    const database = WorkflowRepository.database();
    const requests = new AgentEngineRequestRepository(database);
    const recovery = new AgentEngineRecoveryService(
      requests,
      new AgentPendingInteractionRepository(database),
      (runId) => {
        const run = database.prepare(`
          SELECT profile_id, workflow_id, execution_id, node_id
          FROM agent_runs WHERE id = ?
        `).get(runId) as {
          profile_id: string;
          workflow_id: string;
          execution_id: string;
          node_id: string;
        } | undefined;
        if (!run) throw new Error(`Agent run not found during recovery: ${runId}`);
        const workflow = WorkflowRepository.getWorkflowById(run.workflow_id);
        if (!workflow) throw new Error(`Workflow not found during recovery: ${run.workflow_id}`);
        return new WorkflowToolScheduler(
          requests,
          new AgentEngineResponseRepository(database),
          new ConnectedToolNodeResolver(workflow, run.node_id),
          new WorkflowEngineToolExecutor(workflow, run.execution_id),
          new SideEffectExecutionGuard(
            run.profile_id,
            new AgentSideEffectService(new AgentSideEffectRepository(database)),
          ),
        );
      },
      undefined,
      (event, data) => {
        const runId = typeof data.runId === "string" ? data.runId : undefined;
        const run = runId
          ? database.prepare(`
              SELECT profile_id, workflow_id, execution_id, node_id
              FROM agent_runs WHERE id = ?
            `).get(runId) as {
              profile_id: string;
              workflow_id: string;
              execution_id: string;
              node_id: string;
            } | undefined
          : undefined;
        if (!run) {
          console.info(`[FABRIC | AGENT] ${JSON.stringify({ event, data })}`);
          return;
        }
        const logger = new AgentRuntimeLogger({
          profileId: run.profile_id,
          workflowId: run.workflow_id,
          executionId: run.execution_id,
          nodeId: run.node_id,
          runId,
        });
        if (event === "recovery.failed") logger.error(event, data);
        else logger.info(event, data);
      },
    );
    return recovery.recover();
  },
};
