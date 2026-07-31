export interface AgentContinuationMetadata {
  runId: string;
  sessionId?: string;
  turnId?: string;
  iteration: number;
  previousRequestIds: string[];
  completedToolCallIds: string[];
  pendingRequestId?: string;
  contextRevision: number;
  provider?: {
    id: string;
    payload: Record<string, unknown>;
  };
}
