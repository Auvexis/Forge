import { useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import type { WorkflowItem } from "../types/workflow-types";
import { Save } from "lucide-react";
import {
  Background,
  BackgroundVariant,
  Controls,
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
} from "@xyflow/react";
import { ActionNodeRenderer } from "./nodes/ActionNodeRenderer";
import { TriggerNodeRenderer } from "./nodes/TriggerNodeRenderer";
import { DeletableEdge } from "./edges/DeletableEdge";
import { useExecuteWorkflow } from "../hooks/useExecuteWorkflow";
import { useWorkflowStream } from "../hooks/useWorkflowStream";
import { NodeEditorPanel } from "./NodeEditorPanel";
import { AddNodeOverlay } from "./nodes/AddNodeOverlay";
import { useForge } from "~/providers/ForgeProvider";
import { WorkflowEditorDock } from "./WorkflowEditorDock";
import { WorkflowSettingsPanel } from "./WorkflowSettingsPanel";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";
import { toast } from "~/shared/helpers/toast";
import { useConfirm } from "~/providers/ConfirmProvider";

// Extracted hooks
import { useWorkflowPanelState } from "../hooks/useWorkflowPanelState";
import { useWorkflowNodeFactory } from "../hooks/useWorkflowNodeFactory";
import { useWorkflowSave } from "../hooks/useWorkflowSave";

const nodeTypes: NodeTypes = {
  action: ActionNodeRenderer,
  trigger: TriggerNodeRenderer,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

interface Props {
  workflow: WorkflowItem;
  onClose: () => void;
}

export const WorkflowEditor = ({ workflow, onClose }: Props) => {
  const { plugins, getPlugins } = useForge();
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
      x:
        savedTriggerUI?.positionX ??
        save.triggerPositionRef.current?.x ??
        50,
      y:
        savedTriggerUI?.positionY ??
        save.triggerPositionRef.current?.y ??
        200,
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
          x: nodeData.ui?.positionX ?? 400,
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
      animated: true,
      style: { stroke: "var(--foreground)" },
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
            type: "deletable",
            animated: true,
            style: { stroke: "var(--foreground)" },
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
      } else if (selectedNodes.length === 0) {
        panels.setSelectedNodeId(null);
      }
    },
    [panels],
  );

  const handleExecute = useCallback(
    async (inputParams: Record<string, any>) => {
      try {
        resetNodeStatuses();
        const result = await executeWorkflow(
          workflow.metadata.id,
          inputParams,
        );
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
    [resetNodeStatuses, executeWorkflow, workflow.metadata.id, startStream, save.metadata.name],
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
      <Dialog open={true} onOpenChange={handleRequestClose}>
        <DialogContent
          style={{ backfaceVisibility: "hidden" }}
          className="flex flex-col w-[94vw] h-[94vh] bg-background border border-border max-w-[94vw] overflow-hidden p-0 rounded-[2.5rem] animate-in zoom-in-95 duration-500 transform-gpu will-change-transform antialiased"
        >
          <main className="w-full flex-1 overflow-hidden flex relative bg-background">
            <WorkflowEditorDock
              workflowName={save.metadata.name}
              workflowId={save.metadata.id}
              workflow={{
                metadata: save.metadata,
                trigger:
                  nodes.find((n) => n.id === "trigger")?.data ||
                  workflow.trigger,
                nodes: nodes
                  .filter((n) => n.id !== "trigger")
                  .reduce(
                    (acc, n) => ({ ...acc, [n.id]: n.data }),
                    {},
                  ),
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
                  onClose={() => panels.setSelectedNodeId(null)}
                  nodeStatuses={nodeStatuses}
                />
              )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "deletable" }}
              fitView
              fitViewOptions={{ padding: 0.5, maxZoom: 1 }}
              minZoom={0.2}
              proOptions={{ hideAttribution: true }}
              className="flex-1 bg-transparent"
            >
              <Controls className="rounded-xl! overflow-hidden! mb-5! ml-5! border border-border p-1" />
              <Background
                variant={BackgroundVariant.Dots}
                color="var(--chart-5)"
                bgColor="var(--background)"
                gap={25}
                size={2}
              />
            </ReactFlow>
          </main>
        </DialogContent>
      </Dialog>

    </ReactFlowProvider>
  );
};
