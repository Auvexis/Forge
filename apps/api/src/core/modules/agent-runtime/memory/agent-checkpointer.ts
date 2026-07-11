import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { AgentRuntimeError } from "../agent-errors.ts";

export interface CreateAgentCheckpointerInput {
  dbPath: string;
}

export interface LangGraphThreadConfig {
  configurable: {
    thread_id: string;
  };
}

export type AgentCheckpointer = Pick<SqliteSaver, "deleteThread" | "list">;

const CHAT_SESSION_ID_PATTERN = /^chat_[a-zA-Z0-9_-]+$/;
const SETUP_PROBE_THREAD_ID = "chat_setup_probe";

export async function createAgentCheckpointer(
  input: CreateAgentCheckpointerInput,
): Promise<SqliteSaver> {
  if (!input.dbPath.trim()) {
    throw new AgentRuntimeError(
      "Agent checkpointer database path is required",
      "AGENT_CHECKPOINT_DB_PATH_REQUIRED",
    );
  }

  const checkpointer = SqliteSaver.fromConnString(input.dbPath);
  await ensureCheckpointerSetup(checkpointer);
  return checkpointer;
}

export function toLangGraphThreadConfig(sessionId: string): LangGraphThreadConfig {
  assertChatSessionId(sessionId);
  return { configurable: { thread_id: sessionId } };
}

export async function deleteAgentCheckpoints(
  checkpointer: AgentCheckpointer,
  sessionId: string,
): Promise<void> {
  assertChatSessionId(sessionId);
  await ensureCheckpointerSetup(checkpointer);
  await checkpointer.deleteThread(sessionId);
}

async function ensureCheckpointerSetup(checkpointer: AgentCheckpointer): Promise<void> {
  const setupProbe = checkpointer.list(toLangGraphThreadConfig(SETUP_PROBE_THREAD_ID), {
    limit: 1,
  });
  await setupProbe.next();
}

function assertChatSessionId(sessionId: string): void {
  if (!CHAT_SESSION_ID_PATTERN.test(sessionId)) {
    throw new AgentRuntimeError(
      "LangGraph thread id must be a Fabric chat session id",
      "AGENT_CHECKPOINT_THREAD_INVALID",
      "Invalid chat session id",
    );
  }
}
