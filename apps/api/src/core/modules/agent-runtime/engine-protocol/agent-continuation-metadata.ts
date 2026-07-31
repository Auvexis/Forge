export interface AgentContinuationMetadata {
  runId: string;
  sessionId?: string;
  turnId?: string;
  iteration: number;
  previousRequestIds: string[];
  completedToolCallIds: string[];
  pendingRequestId?: string;
  contextRevision: number;
  provider?: AgentProviderContinuationMetadata;
}
import type { AgentProviderContinuationMetadata } from "./agent-provider-metadata.ts";
