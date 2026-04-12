import { useState, useEffect, useCallback } from "react";
import { type Node, type Edge } from "@xyflow/react";
import { useForge } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";
import { X, Settings, ShieldCheck } from "lucide-react";
import { PluginMenuAuth } from "../../plugins/components/PluginMenuAuth";
import { NODE_EDITOR_REGISTRY } from "./node-editors/index";
import type { NodeEditorProps } from "./node-editors/types";

interface Props {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  onNodeIdChange: (id: string) => void;
  onClose: () => void;
}

/**
 * NodeEditorPanel — thin shell
 *
 * Responsibilities:
 *  - Locate the target node
 *  - Resolve upstream nodes (DAG traversal)
 *  - Provide shared helpers (updateNodeData, injectVariable, handleIdChange)
 *  - Render tabs (Settings / Auth) for plugin nodes
 *  - Delegate content rendering to the NODE_EDITOR_REGISTRY
 *
 * To support a new node type, add an entry to node-editors/index.ts.
 * No changes to this file are needed.
 *
 * IMPORTANT: ALL hooks must be declared before any conditional early return
 * to comply with the Rules of Hooks.
 */
export const NodeEditorPanel = ({
  nodeId,
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodeIdChange,
  onClose,
}: Props) => {
  const { plugins, refreshActivePluginStatus } = useForge();

  // ── ALL STATE AND EFFECTS MUST COME BEFORE ANY EARLY RETURN ──

  const [activeTab, setActiveTab] = useState<"settings" | "auth">("settings");
  // Local state for ID edit (avoids re-render lag while typing)
  const [localId, setLocalId] = useState(nodeId);

  // Reset tabs and localId whenever the target node changes
  useEffect(() => {
    setActiveTab("settings");
  }, [nodeId]);

  useEffect(() => {
    setLocalId(nodeId);
  }, [nodeId]);

  // Resolve node — done before derived values but AFTER all hooks
  const node = nodes.find((n) => n.id === nodeId);

  // Derive node type metadata (safe even if node is undefined, checked below)
  const dataType = (node?.data as any)?.type as string | undefined;
  const pluginId = (node?.data as any)?.pluginId as string | undefined;
  const isPluginNode =
    node?.type === "action" && (!dataType || dataType === "plugin") && !!pluginId;

  // Refresh auth status when entering auth tab for plugin nodes
  useEffect(() => {
    if (activeTab === "auth" && isPluginNode && pluginId) {
      refreshActivePluginStatus(pluginId).catch(console.error);
    }
  }, [activeTab, isPluginNode, pluginId, refreshActivePluginStatus]);

  // ──────────── Shared helpers ────────────

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
        alert("A node with this ID already exists.");
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

  // ──────────── Upstream traversal ────────────

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
      return upstream;
    },
    [edges, nodes],
  );

  // ── ALL HOOKS DECLARED — safe to early-return now ──

  if (!node) return null;

  const upstreamNodes = getUpstreamNodes(nodeId);

  // ──────────── Editor resolution ────────────

  // For trigger nodes use the "trigger" key; for action nodes use dataType or
  // fall back to "plugin" (default for any pluginId-bearing node).
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

  // ──────────── Header label ────────────

  const headerLabel = (() => {
    if (node.type === "trigger") return "Trigger Configuration";
    switch (dataType) {
      case "code":        return "Code Block";
      case "if":          return "Conditional Branch";
      case "loop":        return "Loop / ForEach";
      case "subworkflow": return "Sub-Workflow";
      default: {
        const pluginName = plugins.find(
          (p) => p.id === (node.data as any).pluginId,
        )?.manifest.metadata.name;
        return pluginName || "Action Settings";
      }
    }
  })();

  // ──────────── Render ────────────

  return (
    <div className="absolute top-20 right-4 w-[400px] z-[60] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 max-h-[calc(100%-110px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20 shrink-0">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[9px] uppercase tracking-widest text-foreground/50">
              Component Config
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/50">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">ID:</span>
              <input
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
                onBlur={() => handleIdChange(localId)}
                onKeyDown={(e) => e.key === "Enter" && handleIdChange(localId)}
                className="bg-transparent border-none outline-none text-[10px] font-mono font-black text-primary w-24"
                spellCheck={false}
              />
            </div>
          </div>
          <span className="text-sm font-bold truncate max-w-[280px]">
            {headerLabel}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full ml-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs (plugin nodes only) */}
      {isPluginNode && (
        <div className="flex bg-accent/30 p-1.5 items-center justify-around border-b border-border transition-all">
          <Button
            onClick={() => setActiveTab("settings")}
            variant={activeTab === "settings" ? "default" : "ghost"}
            size="sm"
            className="rounded-full text-xs font-bold px-4"
          >
            <Settings size={12} />
            Parameters
          </Button>
          <Button
            onClick={() => setActiveTab("auth")}
            variant={activeTab === "auth" ? "default" : "ghost"}
            size="sm"
            className="rounded-full text-xs font-bold px-4"
          >
            <ShieldCheck size={12} />
            Authorization
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-2">
        {activeTab === "auth" && isPluginNode ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <PluginMenuAuth pluginId={pluginId!} />
          </div>
        ) : EditorComponent ? (
          <EditorComponent {...editorProps} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unknown node type: <code>{editorKey}</code>
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-accent/10 flex justify-end gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-full text-xs font-bold px-4"
        >
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onClose}
          className="rounded-full text-xs font-bold px-6 h-8"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
