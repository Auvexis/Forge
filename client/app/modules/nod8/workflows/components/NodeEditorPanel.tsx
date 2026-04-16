import { useState, useEffect, useCallback } from "react";
import { type Node, type Edge } from "@xyflow/react";
import { useNod8 } from "~/providers/Nod8Provider";
import { Button } from "~/components/ui/button";
import { X, Settings, ShieldCheck } from "lucide-react";
import { toast } from "~/shared/helpers/toast";
import { PluginMenuAuth } from "../../plugins/components/PluginMenuAuth";
import { NODE_EDITOR_REGISTRY } from "./node-editors/index";
import type { NodeEditorProps } from "./node-editors/types";
import { NodeOutputPanel } from "./NodeOutputPanel";
import type { NodeStatusMap } from "../hooks/useWorkflowStream";
import { cn } from "~/lib/utils";

interface Props {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  onNodeIdChange: (id: string) => void;
  onClose: () => void;
  nodeStatuses?: NodeStatusMap;
}

export const NodeEditorPanel = ({
  nodeId,
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodeIdChange,
  onClose,
  nodeStatuses,
}: Props) => {
  const { plugins, refreshActivePluginStatus } = useNod8();

  const [activeTab, setActiveTab] = useState<"settings" | "auth">("settings");
  const [localId, setLocalId] = useState(nodeId);

  useEffect(() => {
    setActiveTab("settings");
  }, [nodeId]);
  useEffect(() => {
    setLocalId(nodeId);
  }, [nodeId]);

  const node = nodes.find((n) => n.id === nodeId);

  const dataType = (node?.data as any)?.type as string | undefined;
  const pluginId = (node?.data as any)?.pluginId as string | undefined;
  const isPluginNode =
    node?.type === "action" &&
    (!dataType || dataType === "plugin") &&
    !!pluginId;

  useEffect(() => {
    if (activeTab === "auth" && isPluginNode && pluginId) {
      refreshActivePluginStatus(pluginId).catch(console.error);
    }
  }, [activeTab, isPluginNode, pluginId, refreshActivePluginStatus]);

  const updateNodeData = useCallback(
    (newData: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...newData } as any }
            : n,
        ),
      );
    },
    [nodeId, setNodes],
  );

  const injectVariable = useCallback(
    (paramKey: string, variable: string) => {
      if (!node || node.type !== "action") return;
      const currentParams = (node.data as any).params || {};
      const currentValue = currentParams[paramKey] || "";
      updateNodeData({
        params: {
          ...currentParams,
          [paramKey]: `${currentValue}{{ ${variable} }}`,
        },
      });
    },
    [node, updateNodeData],
  );

  const handleIdChange = useCallback(
    (newId: string) => {
      if (!newId || newId === nodeId) return;
      if (nodes.some((n) => n.id === newId)) {
        toast.error("ID Conflict", {
          description: "A node with this ID already exists.",
        });
        setLocalId(nodeId);
        return;
      }
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, id: newId } : n)),
      );
      setEdges((eds) =>
        eds.map((e) => {
          if (e.source === nodeId) return { ...e, source: newId };
          if (e.target === nodeId) return { ...e, target: newId };
          return e;
        }),
      );
      onNodeIdChange(newId);
    },
    [nodeId, nodes, setNodes, setEdges, onNodeIdChange],
  );

  const getUpstreamNodes = useCallback(
    (currentId: string, visited = new Set<string>()): Node[] => {
      if (visited.has(currentId)) return [];
      visited.add(currentId);
      const directEdges = edges.filter((e) => e.target === currentId);
      let upstream: Node[] = [];
      for (const edge of directEdges) {
        const parentNode = nodes.find((n) => n.id === edge.source);
        if (parentNode) {
          upstream.push(parentNode);
          upstream = upstream.concat(getUpstreamNodes(parentNode.id, visited));
        }
      }
      // Diamond merges (same ancestor via two branches) would duplicate node ids
      // and React keys like `steps.extract_file_id.output` in the variable tree.
      const byId = new Map<string, Node>();
      for (const n of upstream) {
        if (!byId.has(n.id)) byId.set(n.id, n);
      }
      return Array.from(byId.values());
    },
    [edges, nodes],
  );

  if (!node) return null;

  const upstreamNodes = getUpstreamNodes(nodeId);
  const editorKey =
    node.type === "trigger" ? "trigger" : (dataType ?? "plugin");
  const EditorComponent = NODE_EDITOR_REGISTRY[editorKey];

  const editorProps: NodeEditorProps = {
    node,
    nodes,
    edges,
    updateNodeData,
    injectVariable,
    upstreamNodes,
  };

  const headerLabel = (() => {
    if (node.type === "trigger") return "Trigger Configuration";
    switch (dataType) {
      case "code":
        return "Code Block";
      case "if":
        return "Conditional Branch";
      case "loop":
        return "Loop / ForEach";
      case "subworkflow":
        return "Sub-Workflow";
      default: {
        const pluginName = plugins.find(
          (p) => p.id === (node.data as any).pluginId,
        )?.manifest.metadata.name;
        return pluginName || "Action Settings";
      }
    }
  })();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 w-[360px] h-full bg-card border-l border-border flex flex-col overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {headerLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">ID:</span>
            <input
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              onBlur={() => handleIdChange(localId)}
              onKeyDown={(e) => e.key === "Enter" && handleIdChange(localId)}
              className="bg-transparent border-none outline-none text-xs font-mono text-nod8-node-editor-panel-header-id-text w-28"
              spellCheck={false}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs — plugin nodes only */}
      {isPluginNode && (
        <div className="flex border-b border-border shrink-0">
          {(["settings", "auth"] as const).map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-none flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-0! border-b-2! h-auto shadow-none hover:bg-transparent",
                activeTab === tab
                  ? "border-nod8-node-editor-panel-tab-border-active text-nod8-node-editor-panel-tab-text-active"
                  : "border-transparent text-nod8-node-editor-panel-tab-text hover:text-nod8-node-editor-panel-tab-text-active",
              )}
            >
              {tab === "settings" ? (
                <Settings className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              {tab === "settings" ? "Parameters" : "Authorization"}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {nodeStatuses?.[nodeId] &&
          (nodeStatuses[nodeId].status === "success" ||
            nodeStatuses[nodeId].status === "failed") && (
            <NodeOutputPanel
              nodeId={nodeId}
              statusInfo={nodeStatuses[nodeId]}
            />
          )}

        {activeTab === "auth" && isPluginNode ? (
          <PluginMenuAuth pluginId={pluginId!} />
        ) : EditorComponent ? (
          <EditorComponent {...editorProps} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unknown node type: <code>{editorKey}</code>
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex justify-end gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-7 px-3 text-xs rounded-md"
        >
          Cancel
        </Button>
        <Button
          variant="emphasis"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-7 px-4 text-xs rounded-md"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
