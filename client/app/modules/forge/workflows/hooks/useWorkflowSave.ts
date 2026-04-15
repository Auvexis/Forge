import { useCallback, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import type {
  WorkflowItem,
  WorkflowNode,
  WorkflowTrigger,
} from "../types/workflow-types";
import { useUpdateWorkflow } from "./useUpdateWorkflow";
import { useDeleteWorkflow } from "./useDeleteWorkflow";
import { toast } from "~/shared/helpers/toast";
import { sanitizeNodeData } from "../utils/workflow-utils";

/**
 * Encapsulates all save-related logic for the workflow editor:
 * - Patch version bumping
 * - Serialising ReactFlow nodes/edges back into the WorkflowItem shape
 * - Persisting to the backend
 * - Handling ID changes (delete old + create new)
 */
export const useWorkflowSave = (
  workflow: WorkflowItem,
  nodes: Node[],
  edges: Edge[],
  onClose: () => void,
) => {
  const { updateWorkflow, loading: saving } = useUpdateWorkflow();
  const { deleteWorkflow } = useDeleteWorkflow();
  const [metadata, setMetadata] = useState(workflow.metadata);
  const [isDirty, setIsDirty] = useState(false);
  const currentWorkflowIdRef = useRef(workflow.metadata.id);
  const triggerPositionRef = useRef<{ x: number; y: number } | null>(null);

  /** Increments the last numeric segment of a semver-like version string. */
  const bumpPatchVersion = (version: string): string => {
    const parts = version.split(".");
    while (parts.length < 3) parts.push("0");
    const patch = parseInt(parts[2] ?? "0", 10);
    parts[2] = String(isNaN(patch) ? 1 : patch + 1);
    return parts.join(".");
  };

  const handleSave = useCallback(
    async (forceClose = true) => {
      const nextVersion = bumpPatchVersion(metadata.version ?? "1.0.0");
      const bumpedMetadata = { ...metadata, version: nextVersion };

      // Trigger — save position
      const triggerReactNode = nodes.find((n) => n.id === "trigger");
      const updatedTrigger = triggerReactNode
        ? {
            ...sanitizeNodeData(triggerReactNode.data as unknown as WorkflowTrigger),
            ui: {
              positionX: triggerReactNode.position.x,
              positionY: triggerReactNode.position.y,
            },
          }
        : workflow.trigger;

      if (triggerReactNode) {
        triggerPositionRef.current = {
          x: triggerReactNode.position.x,
          y: triggerReactNode.position.y,
        };
      }

      // Action nodes — write ReactFlow position into each node's ui field
      const actionNodeMappings: Record<string, WorkflowNode> = {};
      nodes
        .filter((n) => n.id !== "trigger")
        .forEach((n) => {
          actionNodeMappings[n.id] = {
            ...sanitizeNodeData(n.data as unknown as WorkflowNode),
            ui: {
              ...((n.data as any).ui || {}),
              positionX: n.position.x,
              positionY: n.position.y,
            },
          };
        });

      // Edges — preserve handles for branching
      const newEdges = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle as string | undefined,
        targetHandle: edge.targetHandle as string | undefined,
        condition: edge.label as string | undefined,
      }));

      const updatedWorkflow: WorkflowItem = {
        metadata: bumpedMetadata,
        trigger: updatedTrigger,
        nodes: actionNodeMappings,
        edges: newEdges,
        variables: workflow.variables || [],
      };

      try {
        const oldId = currentWorkflowIdRef.current;
        const newId = updatedWorkflow.metadata.id;
        const idChanged = oldId !== newId;

        await updateWorkflow(updatedWorkflow);

        if (idChanged) {
          await deleteWorkflow(oldId);
          currentWorkflowIdRef.current = newId;
        }

        setMetadata(bumpedMetadata);
        setIsDirty(false);
        toast.success("Workflow saved", {
          description: `"${bumpedMetadata.name}" saved as v${nextVersion}.`,
        });
        if (forceClose) onClose();
      } catch (err) {
        // Error is automatically toasted by handleApi
        // We catch it here just to prevent Unhandled Promise Rejection
        console.warn("Workflow save aborted:", err);
      }
    },
    [metadata, nodes, edges, workflow, updateWorkflow, deleteWorkflow, onClose],
  );

  const handleUpdateMetadata = useCallback(
    (newMeta: Partial<typeof workflow.metadata>) => {
      setMetadata((prev) => ({ ...prev, ...newMeta }));
      setIsDirty(true);
    },
    [],
  );

  return {
    metadata,
    isDirty,
    setIsDirty,
    saving,
    triggerPositionRef,
    handleSave,
    handleUpdateMetadata,
  };
};
