import { useEffect, useCallback, useRef, useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";
import { Save } from "lucide-react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  type Edge,
  type Node,
  type NodeTypes,
  type Connection,
  type OnSelectionChangeParams,
  ReactFlowProvider,
  MarkerType,
  type ReactFlowInstance,
} from "@xyflow/react";
import { ActionNodeRenderer } from "./nodes/ActionNodeRenderer";
import { TriggerNodeRenderer } from "./nodes/TriggerNodeRenderer";
import { WorkflowEdge } from "./edges/WorkflowEdge";
import { useExecuteWorkflow } from "../hooks/useExecuteWorkflow";
import { useWorkflowStream } from "../hooks/useWorkflowStream";
import { NodeEditorPanel } from "./NodeEditorPanel";
import { AddNodeOverlay } from "./nodes/AddNodeOverlay";
import { useForge } from "~/providers/ForgeProvider";
import { WorkflowEditorDock } from "./WorkflowEditorDock";
import { WorkflowSettingsPanel } from "./WorkflowSettingsPanel";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";
import { ZoomSlider } from "~/components/zoom-slider";
import { toast } from "~/shared/helpers/toast";
import { useConfirm } from "~/providers/ConfirmProvider";

// Extracted hooks
import { useWorkflowPanelState } from "../hooks/useWorkflowPanelState";
import { useWorkflowNodeFactory } from "../hooks/useWorkflowNodeFactory";
import { useWorkflowSave } from "../hooks/useWorkflowSave";

// Defined outside component to avoid re-creation on every render
const nodeTypes: NodeTypes = {
  action: ActionNodeRenderer,
  trigger: TriggerNodeRenderer,
};

const edgeTypes = {
  workflow: WorkflowEdge,
};

const defaultEdgeOptions = {
  type: "workflow",
  animated: false,
  style: { stroke: "var(--accent)", strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: "var(--accent)",
  },
};

interface Props {
  workflow: WorkflowItem;
  onClose: () => void;
}

export const WorkflowEditor = ({ workflow, onClose }: Props) => {
  const { plugins, getPlugins } = useForge();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { executeWorkflow, loading: executing } = useExecuteWorkflow();
  const { nodeStatuses, isStreaming, startStream, cancelStream, resetStream } =
    useWorkflowStream();

  // Panel state (mutually exclusive)
  const panels = useWorkflowPanelState();

  // Save logic
  const save = useWorkflowSave(workflow, nodes, edges, onClose);

  // Node factory
  const factory = useWorkflowNodeFactory(
    setNodes,
    panels.setIsAddingNode,
    panels.setSelectedNodeId,
    rfInstance
  );

  const confirm = useConfirm();
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (plugins.length === 0) {
      getPlugins();
    }
  }, [plugins.length, getPlugins]);

  // ──────────── Initial Data Mapping ────────────
  useEffect(() => {
    const savedTriggerUI = (workflow.trigger as any)?.ui;
    const triggerPos = {
      x: savedTriggerUI?.positionX ?? save.triggerPositionRef.current?.x ?? 80,
      y: savedTriggerUI?.positionY ?? save.triggerPositionRef.current?.y ?? 200,
    };

    const triggerNode: Node = {
      id: "trigger",
      type: "trigger",
      position: triggerPos,
      data: workflow.trigger as any,
    };

    const actionNodes: Node[] = Object.entries(workflow.nodes).map(
      ([id, nodeData]) => ({
        id,
        type: "action",
        position: {
          x: nodeData.ui?.positionX ?? 450,
          y: nodeData.ui?.positionY ?? 200,
        },
        data: nodeData as any,
      }),
    );

    setNodes([triggerNode, ...actionNodes]);

    const reactFlowEdges: Edge[] = workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      label: edge.condition,
      type: "workflow",
      animated: false,
      style: { stroke: "var(--accent)", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "var(--accent)",
      },
    }));

    setEdges(reactFlowEdges);

    initialLoadDone.current = false;
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
  }, [workflow, setNodes, setEdges, save.triggerPositionRef]);

  // ── Sync SSE node statuses ──
  useEffect(() => {
    if (Object.keys(nodeStatuses).length === 0) return;
    setNodes((nds) =>
      nds.map((n) => {
        const info = nodeStatuses[n.id];
        if (!info) return n;
        return { ...n, data: { ...n.data, _executionStatus: info.status } };
      }),
    );
  }, [nodeStatuses, setNodes]);

  const resetNodeStatuses = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, _executionStatus: "idle" },
      })),
    );
    resetStream();
  }, [setNodes, resetStream]);

  // ── Dirty tracking wrappers ──
  const onNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeDefault(changes);
      const isMeaningful = changes.some(
        (c: any) =>
          c.type === "position" ||
          c.type === "remove" ||
          c.type === "add" ||
          c.type === "reset",
      );
      if (isMeaningful && initialLoadDone.current) save.setIsDirty(true);
    },
    [onNodesChangeDefault, save],
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeDefault(changes);
      const isMeaningful = changes.some(
        (c: any) =>
          c.type === "remove" || c.type === "add" || c.type === "reset",
      );
      if (isMeaningful && initialLoadDone.current) save.setIsDirty(true);
    },
    [onEdgesChangeDefault, save],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "workflow",
            animated: false,
            style: {
              stroke: "var(--accent)",
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "var(--accent)",
            },
          },
          eds,
        ),
      );
      save.setIsDirty(true);
    },
    [setEdges, save],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      panels.openNodeEditor(node.id);
    },
    [panels],
  );

  const handleSetNodes = useCallback(
    (nds: Node[] | ((nds: Node[]) => Node[])) => {
      setNodes(nds);
      if (initialLoadDone.current) save.setIsDirty(true);
    },
    [setNodes, save],
  );

  const handleSetEdges = useCallback(
    (eds: Edge[] | ((eds: Edge[]) => Edge[])) => {
      setEdges(eds);
      if (initialLoadDone.current) save.setIsDirty(true);
    },
    [setEdges, save],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length === 1) {
        panels.openNodeEditor(selectedNodes[0].id);
      } else {
        panels.setSelectedNodeId(null);
      }
    },
    [panels],
  );

  const handleExecute = useCallback(
    async (inputParams: Record<string, any>) => {
      try {
        resetNodeStatuses();
        const result = await executeWorkflow(workflow.metadata.id, inputParams);
        const executionId = (result as any)?.executionId;
        if (executionId) {
          startStream(executionId);
          toast.success("Workflow started", {
            description: `Streaming execution of "${save.metadata.name}"...`,
          });
        }
      } catch (e: any) {
        console.error("Workflow Execution Failed Error:", e);
      }
    },
    [
      resetNodeStatuses,
      executeWorkflow,
      workflow.metadata.id,
      startStream,
      save.metadata.name,
    ],
  );

  const handleRequestClose = useCallback(async () => {
    if (save.isDirty) {
      const shouldSave = await confirm({
        title: "Unsaved Changes",
        description:
          "You have modified this workflow. Do you want to save your changes before leaving?",
        confirmLabel: "Save and Exit",
        confirmIcon: Save,
        cancelLabel: "Discard Changes",
        variant: "default",
      });
      if (shouldSave) {
        await save.handleSave(true);
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  }, [save, confirm, onClose]);

  return (
    <ReactFlowProvider>
      {/* Full-screen editor — no Dialog wrapper, fills the parent container */}
      <div className="w-full h-full relative flex flex-col bg-background overflow-hidden animate-in fade-in zoom-in-[0.98] duration-300">
        <div className="w-full flex-1 overflow-hidden flex relative">
          <WorkflowEditorDock
            workflowName={save.metadata.name}
            workflowId={save.metadata.id}
            workflow={{
              metadata: save.metadata,
              trigger:
                nodes.find((n) => n.id === "trigger")?.data || workflow.trigger,
              nodes: nodes
                .filter((n) => n.id !== "trigger")
                .reduce((acc, n) => ({ ...acc, [n.id]: n.data }), {}),
              edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                condition: e.label,
              })),
            }}
            onRun={panels.openRun}
            onStop={cancelStream}
            onAddNode={panels.openAddNode}
            onSave={() => save.handleSave(false)}
            onSettings={panels.openSettings}
            onLogs={panels.toggleLogs}
            onClose={handleRequestClose}
            isSaving={save.saving}
            isExecuting={executing}
            isStreaming={isStreaming}
            isLogsOpen={panels.isLogsOpen}
            isDirty={save.isDirty}
          />

          {/* Side Panels */}
          {panels.isEditingSettings && (
            <WorkflowSettingsPanel
              workflow={{ ...workflow, metadata: save.metadata }}
              onUpdate={save.handleUpdateMetadata}
              onClose={() => panels.setIsEditingSettings(false)}
            />
          )}

          {panels.isAddingNode && (
            <AddNodeOverlay
              onAddNode={factory.handleCreateNode}
              onAddLogicNode={factory.handleCreateLogicNode}
              onClose={() => panels.setIsAddingNode(false)}
            />
          )}

          {panels.isRunningWorkflow && (
            <RunWorkflowPanel
              workflow={{ ...workflow, metadata: save.metadata }}
              onExecute={handleExecute}
              onClose={() => panels.setIsRunningWorkflow(false)}
              loading={executing}
            />
          )}

          {panels.isLogsOpen && (
            <WorkflowLogsPanel
              workflowId={workflow.metadata.id}
              onClose={() => panels.setIsLogsOpen(false)}
            />
          )}

          {panels.selectedNodeId &&
            !panels.isAddingNode &&
            !panels.isEditingSettings &&
            !panels.isRunningWorkflow && (
              <NodeEditorPanel
                nodeId={panels.selectedNodeId}
                nodes={nodes}
                edges={edges}
                setNodes={handleSetNodes}
                setEdges={handleSetEdges}
                onNodeIdChange={panels.setSelectedNodeId}
                onClose={() => {
                  panels.setSelectedNodeId(null);
                  setNodes((nds) =>
                    nds.map((n) => ({ ...n, selected: false })),
                  );
                }}
                nodeStatuses={nodeStatuses}
              />
            )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={setRfInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.2 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="flex-1 bg-transparent"
          >
            <ZoomSlider position="bottom-center" className="mb-5! mr-5! border border-border shadow-xl bg-card/80 backdrop-blur-md p-2 rounded-2xl" />
            <Background
              variant={BackgroundVariant.Dots}
              color="var(--chart-5)"
              bgColor="var(--background)"
              gap={25}
              size={2}
            />
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
};
