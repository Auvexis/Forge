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

export type WorkflowExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

// ──────────── Hook ────────────

export function useWorkflowStream() {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>({});
  const [workflowStatus, setWorkflowStatus] =
    useState<WorkflowExecutionStatus>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeExecutionIdRef = useRef<string | null>(null);

  const startStream = useCallback((executionId: string) => {
    // Close any existing connection first
    eventSourceRef.current?.close();

    activeExecutionIdRef.current = executionId;
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
          activeExecutionIdRef.current = null;
          es.close();
          break;

        case "workflow:failed":
          setWorkflowStatus("failed");
          setIsStreaming(false);
          activeExecutionIdRef.current = null;
          es.close();
          break;

        case "workflow:cancelled":
          setWorkflowStatus("cancelled");
          setIsStreaming(false);
          activeExecutionIdRef.current = null;
          // Mark all still-running nodes as idle (they were skipped)
          setNodeStatuses((prev) => {
            const next = { ...prev };
            for (const [id, info] of Object.entries(next)) {
              if (info.status === "running") {
                next[id] = { ...info, status: "idle" };
              }
            }
            return next;
          });
          es.close();
          break;
      }
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
    };
  }, []);

  /**
   * Send a cancellation request to the backend.
   * The executor will stop at its next node checkpoint.
   */
  const cancelStream = useCallback(async () => {
    const id = activeExecutionIdRef.current;
    if (!id) return;

    try {
      await fetch(`${API_BASE_URL}/workflows/executions/${id}/cancel`, {
        method: "POST",
      });
    } catch {
      // Best-effort — the SSE event will confirm cancellation
    }
  }, []);

  const stopStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
    activeExecutionIdRef.current = null;
  }, []);

  const resetStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
    activeExecutionIdRef.current = null;
    setWorkflowStatus("idle");
    setNodeStatuses({});
  }, []);

  return {
    nodeStatuses,
    workflowStatus,
    isStreaming,
    startStream,
    stopStream,
    cancelStream,
    resetStream,
  };
}
