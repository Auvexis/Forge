import { useCallback } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import type { WorkflowNodeType } from "../types/workflow-types";

/**
 * Factory hook for creating workflow nodes (plugin + logic types).
 * Extracts the node creation logic from WorkflowEditor.
 */
export const useWorkflowNodeFactory = (
  setNodes: (updater: (nds: Node[]) => Node[]) => void,
  setIsAddingNode: (v: boolean) => void,
  setSelectedNodeId: (id: string) => void,
  reactFlowInstance: ReactFlowInstance | null,
) => {
  const getCenterPosition = useCallback(() => {
    if (reactFlowInstance) {
      const { innerWidth, innerHeight } = window;
      return reactFlowInstance.screenToFlowPosition({
        x: innerWidth / 2,
        y: innerHeight / 2,
      });
    }
    return { x: 400, y: 200 };
  }, [reactFlowInstance]);

  const handleCreateNode = useCallback(
    (pluginId: string, action: string, actionName: string) => {
      const newNodeId = `node_${Date.now()}`;
      const position = getCenterPosition();
      const newNode: Node = {
        id: newNodeId,
        type: "action",
        position,
        data: {
          type: "plugin" as const,
          pluginId,
          action,
          name: actionName,
          params: {},
          ui: { positionX: position.x, positionY: position.y },
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsAddingNode(false);
      setTimeout(() => setSelectedNodeId(newNodeId), 50);
    },
    [setNodes, setIsAddingNode, setSelectedNodeId, getCenterPosition],
  );

  const handleCreateLogicNode = useCallback(
    (type: WorkflowNodeType) => {
      const newNodeId = `node_${Date.now()}`;
      const position = getCenterPosition();

      const baseData: Record<string, any> = {
        type,
        name: "",
        ui: { positionX: position.x, positionY: position.y },
      };

      switch (type) {
        case "code":
          baseData.language = "javascript";
          baseData.script = "";
          baseData.name = "Code Block";
          break;
        case "if":
          baseData.condition = "";
          baseData.name = "Condition";
          break;
        case "loop":
          baseData.collection = "";
          baseData.maxIterations = 1000;
          baseData.name = "Loop";
          break;
        case "subworkflow":
          baseData.workflowId = "";
          baseData.inputMapping = {};
          baseData.name = "Sub-Workflow";
          break;
        case "http":
          baseData.method = "GET";
          baseData.url = "";
          baseData.headers = {};
          baseData.body = "";
          baseData.bodyType = "json";
          baseData.name = "HTTP Request";
          break;
        case "event":
          baseData.eventName = "";
          baseData.payloadMapping = {};
          baseData.name = "Emit Event";
          break;
      }

      const newNode: Node = {
        id: newNodeId,
        type: "action",
        position,
        data: baseData,
      };

      setNodes((nds) => nds.concat(newNode));
      setIsAddingNode(false);
      setTimeout(() => setSelectedNodeId(newNodeId), 50);
    },
    [setNodes, setIsAddingNode, setSelectedNodeId, getCenterPosition],
  );

  return { handleCreateNode, handleCreateLogicNode };
};
