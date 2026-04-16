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
import { useNod8 } from "~/providers/Nod8Provider";
import { WorkflowEditorDock } from "./WorkflowEditorDock";
import { WorkflowSettingsPanel } from "./WorkflowSettingsPanel";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";
import { ImportWorkflowDialog } from "./ImportWorkflowDialog";
import { WFEditorFloatingDock } from "./WFEditorFloatingDock";
import { ZoomSlider } from "~/components/zoom-slider";
import { toast } from "~/shared/helpers/toast";
import { useConfirm } from "~/providers/ConfirmProvider";

// Extracted hooks
import { useWorkflowPanelState } from "../hooks/useWorkflowPanelState";
import { useWorkflowNodeFactory } from "../hooks/useWorkflowNodeFactory";
import { useWorkflowSave } from "../hooks/useWorkflowSave";
import { sanitizeNodeData } from "../utils/workflow-utils";

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
  style: { stroke: "var(--nod8-rf-edge-stroke)", strokeWidth: 1.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "var(--nod8-rf-edge-stroke)",
  },
};

interface Props {
  workflow: WorkflowItem;
  onClose: () => void;
  /** All workflows — for the switcher dropdown */
  workflows?: WorkflowItem[];
  /** Called after every successful save so the parent can refresh its list */
  onSaved?: () => void;
}

export const WorkflowEditor = ({
  workflow,
  onClose,
  workflows = [],
  onSaved,
}: Props) => {
  const { plugins, getPlugins, setSelectedWorkflowId } = useNod8();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
  const { executeWorkflow, loading: executing } = useExecuteWorkflow();
  const { nodeStatuses, isStreaming, startStream, cancelStream, resetStream } =
    useWorkflowStream();

  // Panel state (mutually exclusive)
  const panels = useWorkflowPanelState();

  // Import dialog (can be triggered from the floating dock)
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Save logic
  const save = useWorkflowSave(workflow, nodes, edges, onClose);

  // Node factory
  const factory = useWorkflowNodeFactory(
    setNodes,
    panels.setIsAddingNode,
    panels.setSelectedNodeId,
    rfInstance,
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
      data: sanitizeNodeData(workflow.trigger as any),
    };

    const actionNodes: Node[] = Object.entries(workflow.nodes).map(
      ([id, nodeData]) => ({
        id,
        type: "action",
        position: {
          x: nodeData.ui?.positionX ?? 450,
          y: nodeData.ui?.positionY ?? 200,
        },
        data: sanitizeNodeData(nodeData as any),
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
      style: { stroke: "var(--nod8-rf-edge-stroke)", strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: "var(--nod8-rf-edge-stroke)",
      },
    }));

    setEdges(reactFlowEdges);

    initialLoadDone.current = false;
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
  }, [workflow.metadata.id, setNodes, setEdges]); // Only reset when we actually switch workflows

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
            style: { stroke: "var(--nod8-rf-edge-stroke)", strokeWidth: 1.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: "var(--nod8-rf-edge-stroke)",
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

  // Wrap save to also notify parent for list refresh
  const handleSave = useCallback(
    async (andClose: boolean) => {
      await save.handleSave(andClose);
      onSaved?.();
    },
    [save, onSaved],
  );

  const handleExecute = useCallback(
    async (inputParams: Record<string, any>) => {
      try {
        resetNodeStatuses();
        const executionId = `exec_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        // Open SSE before multipart upload — otherwise events are emitted while fetch is still in flight.
        startStream(executionId);
        toast.success("Workflow started", {
          description: `Streaming execution of "${save.metadata.name}"...`,
        });
        const result = await executeWorkflow(
          workflow.metadata.id,
          inputParams,
          executionId,
        );
        const serverId = (result as { executionId?: string } | null)
          ?.executionId;
        if (serverId && serverId !== executionId) {
          startStream(serverId);
        }
      } catch (e: any) {
        console.error("Workflow Execution Failed Error:", e);
        resetStream();
      }
    },
    [
      resetNodeStatuses,
      executeWorkflow,
      workflow.metadata.id,
      startStream,
      resetStream,
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
        await handleSave(true);
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  }, [save, confirm, onClose]);

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-background overflow-hidden">
        {/* Top Toolbar */}
        <WorkflowEditorDock
          workflowName={save.metadata.name}
          workflowId={save.metadata.id}
          workflow={{
            metadata: save.metadata,
            trigger: sanitizeNodeData(
              nodes.find((n) => n.id === "trigger")?.data || workflow.trigger,
            ),
            nodes: nodes
              .filter((n) => n.id !== "trigger")
              .reduce(
                (acc, n) => ({ ...acc, [n.id]: sanitizeNodeData(n.data) }),
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
          onSave={() => handleSave(false)}
          onSettings={panels.openSettings}
          onLogs={panels.toggleLogs}
          onClose={handleRequestClose}
          isSaving={save.saving}
          isExecuting={executing}
          isStreaming={isStreaming}
          isLogsOpen={panels.isLogsOpen}
          isDirty={save.isDirty}
          workflows={workflows}
          onSwitchWorkflow={(id) => setSelectedWorkflowId(id)}
        />

        {/* Canvas + Panels */}
        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            id="workflow-editor-flow"
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
            className="w-full h-full"
            // snapToGrid={true}
            // snapGrid={[15, 15]}
          >
            <ZoomSlider
              position="bottom-center"
              className="bg-nod8-rf-zoom-bg border border-b-0 -bottom-3! border-nod8-rf-zoom-border rounded-none p-1"
            />
            <WFEditorFloatingDock
              onRun={panels.openRun}
              onStop={cancelStream}
              onAddNode={panels.openAddNode}
              onImport={() => setShowImportDialog(true)}
              onSave={() => handleSave(false)}
              isSaving={save.saving}
              isDirty={save.isDirty}
              isExecuting={executing}
              isStreaming={isStreaming}
            />
            <Background
              id="workflow-editor-bg"
              variant={BackgroundVariant.Dots}
              color="var(--nod8-rf-canvas-dots)"
              bgColor="var(--nod8-rf-canvas-bg)"
              gap={20}
              size={1}
            />
          </ReactFlow>

          {/* Edge-docked panels (right side) */}
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
              workflow={{
                ...workflow,
                metadata: save.metadata,
                // Use the LIVE trigger from the canvas, not the stale server snapshot
                trigger:
                  (nodes.find((n) => n.id === "trigger")?.data as any) ??
                  workflow.trigger,
              }}
              onExecute={handleExecute}
              onClose={() => panels.setIsRunningWorkflow(false)}
              loading={executing}
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

          {/* Centered floating overlay panel */}
          {panels.isLogsOpen && (
            <WorkflowLogsPanel
              workflowId={workflow.metadata.id}
              onClose={() => panels.setIsLogsOpen(false)}
            />
          )}
        </div>

        {/* Import dialog triggered from the floating dock */}
        {showImportDialog && (
          <ImportWorkflowDialog
            onClose={() => setShowImportDialog(false)}
            onImported={() => {
              setShowImportDialog(false);
              onSaved?.();
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
};
