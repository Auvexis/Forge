import { useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "~/shared/constants";

// ──────────── Types ────────────

export type NodeExecutionStatus = "idle" | "running" | "success" | "failed";

export interface NodeStatusInfo {
  status: NodeExecutionStatus;
  output?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export type NodeStatusMap = Record<string, NodeStatusInfo>;

// ──────────── Hook ────────────

export function useWorkflowStream() {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>({});
  const [workflowStatus, setWorkflowStatus] = useState<
    "idle" | "running" | "success" | "failed"
  >("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback((executionId: string) => {
    // Close any existing connection first
    eventSourceRef.current?.close();

    setIsStreaming(true);
    setWorkflowStatus("running");
    setNodeStatuses({});

    const es = new EventSource(
      `${API_BASE_URL}/workflows/executions/${executionId}/stream`,
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "workflow:start":
          setWorkflowStatus("running");
          break;

        case "node:start":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: {
              status: "running",
              startedAt: data.timestamp,
            },
          }));
          break;

        case "node:success":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: {
              status: "success",
              output: data.data,
              startedAt: prev[data.nodeId]?.startedAt,
              completedAt: data.timestamp,
            },
          }));
          break;

        case "node:failed":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: {
              status: "failed",
              error: data.error,
              startedAt: prev[data.nodeId]?.startedAt,
              completedAt: data.timestamp,
            },
          }));
          break;

        case "workflow:success":
          setWorkflowStatus("success");
          setIsStreaming(false);
          es.close();
          break;

        case "workflow:failed":
          setWorkflowStatus("failed");
          setIsStreaming(false);
          es.close();
          break;
      }
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
    };
  }, []);

  const stopStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
  }, []);

  const resetStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
    setWorkflowStatus("idle");
    setNodeStatuses({});
  }, []);

  return {
    nodeStatuses,
    workflowStatus,
    isStreaming,
    startStream,
    stopStream,
    resetStream,
  };
}
