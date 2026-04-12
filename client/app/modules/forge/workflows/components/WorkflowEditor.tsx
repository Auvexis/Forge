import { useEffect, useCallback, useState, useRef } from "react";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import type {
  WorkflowItem,
  WorkflowNode,
  WorkflowTrigger,
  WorkflowNodeType,
} from "../types/workflow-types";
import { Button } from "~/components/ui/button";
import { X, Plus, Save, Loader2, Play } from "lucide-react";
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
import { useUpdateWorkflow } from "../hooks/useUpdateWorkflow";
import { useDeleteWorkflow } from "../hooks/useDeleteWorkflow";
import { useExecuteWorkflow } from "../hooks/useExecuteWorkflow";
import { NodeEditorPanel } from "./NodeEditorPanel";
import { AddNodeOverlay } from "./nodes/AddNodeOverlay";
import { useForge } from "~/providers/ForgeProvider";
import { WorkflowEditorDock } from "./WorkflowEditorDock";
import { WorkflowSettingsPanel } from "./WorkflowSettingsPanel";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

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
  const [metadata, setMetadata] = useState(workflow.metadata);
  const { updateWorkflow, loading: saving } = useUpdateWorkflow();
  const { deleteWorkflow } = useDeleteWorkflow();
  const { executeWorkflow, loading: executing } = useExecuteWorkflow();

  const currentWorkflowIdRef = useRef(workflow.metadata.id);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Persist trigger position across save/load
  const triggerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (plugins.length === 0) {
      getPlugins();
    }
  }, [plugins.length, getPlugins]);

  // ──────────── Initial Data Mapping ────────────
  useEffect(() => {
    // Trigger node: read position from saved data or use default
    const savedTriggerUI = (workflow.trigger as any)?.ui;
    const triggerPos = {
      x: savedTriggerUI?.positionX ?? triggerPositionRef.current?.x ?? 50,
      y: savedTriggerUI?.positionY ?? triggerPositionRef.current?.y ?? 200,
    };

    const triggerNode: Node = {
      id: "trigger",
      type: "trigger",
      position: triggerPos,
      data: workflow.trigger as any,
    };

    // Action nodes: read position from saved ui data
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

    // Set flag to start tracking dirtiness after initial layout
    initialLoadDone.current = false;
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
  }, [workflow, setNodes, setEdges]);

  // Dirty State Tracking
  const onNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeDefault(changes);
      // Only set dirty if it's a meaningful change (position or removal)
      const isMeaningful = changes.some(
        (c: any) =>
          c.type === "position" ||
          c.type === "remove" ||
          c.type === "add" ||
          c.type === "reset",
      );
      if (isMeaningful && initialLoadDone.current) {
        setIsDirty(true);
      }
    },
    [onNodesChangeDefault],
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeDefault(changes);
      const isMeaningful = changes.some(
        (c: any) =>
          c.type === "remove" || c.type === "add" || c.type === "reset",
      );
      if (isMeaningful && initialLoadDone.current) {
        setIsDirty(true);
      }
    },
    [onEdgesChangeDefault],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "deletable", // Use our custom edge type
            animated: true,
            style: { stroke: "var(--foreground)" },
          },
          eds,
        ),
      );
      setIsDirty(true);
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setIsAddingNode(false);
    setIsEditingSettings(false);
    setIsRunningWorkflow(false);
    setSelectedNodeId(node.id);
  }, []);

  const handleSetNodes = useCallback(
    (nds: Node[] | ((nds: Node[]) => Node[])) => {
      setNodes(nds);
      if (initialLoadDone.current) setIsDirty(true);
    },
    [setNodes],
  );

  const handleSetEdges = useCallback(
    (eds: Edge[] | ((eds: Edge[]) => Edge[])) => {
      setEdges(eds);
      if (initialLoadDone.current) setIsDirty(true);
    },
    [setEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length === 1) {
        setIsAddingNode(false);
        setIsEditingSettings(false);
        setIsRunningWorkflow(false);
        setSelectedNodeId(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        setSelectedNodeId(null);
      }
    },
    [],
  );

  // ──────────── Add Plugin Node ────────────
  const handleCreateNode = (
    pluginId: string,
    action: string,
    actionName: string,
  ) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: "action",
      position: { x: 400, y: 200 },
      data: {
        type: "plugin" as const,
        pluginId,
        action,
        name: actionName,
        params: {},
        ui: { positionX: 400, positionY: 200 },
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setIsAddingNode(false);
    setTimeout(() => setSelectedNodeId(newNodeId), 50);
  };

  // ──────────── Add Logic Node ────────────
  const handleCreateLogicNode = (type: WorkflowNodeType) => {
    const newNodeId = `node_${Date.now()}`;

    const baseData: Record<string, any> = {
      type,
      name: "",
      ui: { positionX: 400, positionY: 200 },
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
    }

    const newNode: Node = {
      id: newNodeId,
      type: "action",
      position: { x: 400, y: 200 },
      data: baseData,
    };

    setNodes((nds) => nds.concat(newNode));
    setIsAddingNode(false);
    setTimeout(() => setSelectedNodeId(newNodeId), 50);
  };

  const handleRunRequest = () => {
    setSelectedNodeId(null);
    setIsAddingNode(false);
    setIsEditingSettings(false);
    setIsRunningWorkflow(true);
  };

  const handleExecute = async (inputParams: Record<string, any>) => {
    try {
      const result = await executeWorkflow(workflow.metadata.id, inputParams);
      console.log("Workflow Execution Result:", result);
      alert("Workflow executed successfully!");
    } catch (e: any) {
      console.error("Workflow Execution Failed Error:", e);
      alert(`Execution Failed: ${e.message || "Unknown error"}`);
    }
  };

  const handleUpdateMetadata = (newMeta: Partial<typeof workflow.metadata>) => {
    setMetadata((prev) => ({ ...prev, ...newMeta }));
    setIsDirty(true);
  };

  // ──────────── Save ────────────
  const handleSave = async (forceClose = true) => {
    // 1. Trigger — save position into the trigger data
    const triggerReactNode = nodes.find((n) => n.id === "trigger");
    const updatedTrigger = triggerReactNode
      ? {
          ...(triggerReactNode.data as unknown as WorkflowTrigger),
          ui: {
            positionX: triggerReactNode.position.x,
            positionY: triggerReactNode.position.y,
          },
        }
      : workflow.trigger;

    // Cache trigger position for immediate re-renders
    if (triggerReactNode) {
      triggerPositionRef.current = {
        x: triggerReactNode.position.x,
        y: triggerReactNode.position.y,
      };
    }

    // 2. Action nodes — write ReactFlow position into each node's ui field
    const actionNodeMappings: Record<string, WorkflowNode> = {};
    nodes
      .filter((n) => n.id !== "trigger")
      .forEach((n) => {
        actionNodeMappings[n.id] = {
          ...(n.data as unknown as WorkflowNode),
          ui: {
            ...((n.data as any).ui || {}),
            positionX: n.position.x,
            positionY: n.position.y,
          },
        };
      });

    // 3. Edges — preserve handles for branching
    const newEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle as string | undefined,
      targetHandle: edge.targetHandle as string | undefined,
      condition: edge.label as string | undefined,
    }));

    // 4. Build full payload — include variables
    const updatedWorkflow: WorkflowItem = {
      metadata: metadata,
      trigger: updatedTrigger,
      nodes: actionNodeMappings,
      edges: newEdges,
      variables: workflow.variables || [],
    };

    const oldId = currentWorkflowIdRef.current;
    const newId = updatedWorkflow.metadata.id;
    const idChanged = oldId !== newId;

    await updateWorkflow(updatedWorkflow);

    if (idChanged) {
      // If ID changed, we need to delete the old version from DB
      // since the repository use INSERT OR REPLACE which would leave the old one behind
      await deleteWorkflow(oldId);
      currentWorkflowIdRef.current = newId;
    }

    setIsDirty(false);
    if (forceClose) onClose();
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <ReactFlowProvider>
      <Dialog open={true} onOpenChange={handleRequestClose}>
        <DialogContent 
          style={{ backfaceVisibility: 'hidden' }}
          className="flex flex-col w-[94vw] h-[94vh] bg-background border border-border max-w-[94vw] overflow-hidden p-0 rounded-[2.5rem] animate-in zoom-in-95 duration-500 transform-gpu will-change-transform antialiased"
        >
          <main className="w-full flex-1 overflow-hidden flex relative bg-background">
            <WorkflowEditorDock
              workflowName={metadata.name}
              workflowId={metadata.id}
              workflow={{
                metadata,
                trigger: nodes.find(n => n.id === 'trigger')?.data || workflow.trigger,
                nodes: nodes.filter(n => n.id !== 'trigger').reduce((acc, n) => ({ ...acc, [n.id]: n.data }), {}),
                edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, condition: e.label })),
              }}
              onRun={() => {
                setSelectedNodeId(null);
                setIsAddingNode(false);
                setIsEditingSettings(false);
                setIsLogsOpen(false);
                handleRunRequest();
              }}
              onAddNode={() => {
                setSelectedNodeId(null);
                setIsEditingSettings(false);
                setIsRunningWorkflow(false);
                setIsLogsOpen(false);
                setIsAddingNode(true);
              }}
              onSave={() => handleSave(false)}
              onSettings={() => {
                setSelectedNodeId(null);
                setIsAddingNode(false);
                setIsRunningWorkflow(false);
                setIsLogsOpen(false);
                setIsEditingSettings(true);
              }}
              onLogs={() => {
                setSelectedNodeId(null);
                setIsAddingNode(false);
                setIsRunningWorkflow(false);
                setIsEditingSettings(false);
                setIsLogsOpen(!isLogsOpen);
              }}
              onClose={handleRequestClose}
              isSaving={saving}
              isExecuting={executing}
              isLogsOpen={isLogsOpen}
              isDirty={isDirty}
            />

            {/* Side Panels */}
            {isEditingSettings && (
              <WorkflowSettingsPanel
                workflow={{ ...workflow, metadata }}
                onUpdate={handleUpdateMetadata}
                onClose={() => setIsEditingSettings(false)}
              />
            )}

            {isAddingNode && (
              <AddNodeOverlay
                onAddNode={handleCreateNode}
                onAddLogicNode={handleCreateLogicNode}
                onClose={() => setIsAddingNode(false)}
              />
            )}

            {isRunningWorkflow && (
              <RunWorkflowPanel
                workflow={{ ...workflow, metadata }}
                onExecute={handleExecute}
                onClose={() => setIsRunningWorkflow(false)}
                loading={executing}
              />
            )}

            {isLogsOpen && (
              <WorkflowLogsPanel
                workflowId={workflow.metadata.id}
                onClose={() => setIsLogsOpen(false)}
              />
            )}

            {selectedNodeId &&
              !isAddingNode &&
              !isEditingSettings &&
              !isRunningWorkflow && (
                <NodeEditorPanel
                  nodeId={selectedNodeId}
                  nodes={nodes}
                  edges={edges}
                  setNodes={handleSetNodes}
                  setEdges={handleSetEdges}
                  onNodeIdChange={setSelectedNodeId}
                  onClose={() => setSelectedNodeId(null)}
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

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have modified this workflow. Do you want to save your changes
              before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={onClose}
              className="rounded-full font-bold px-6"
            >
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 rounded-full font-bold px-6"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ReactFlowProvider>
  );
};
