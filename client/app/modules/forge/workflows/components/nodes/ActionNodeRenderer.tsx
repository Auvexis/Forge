import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { type NodeProps, type Node } from "@xyflow/react";
import { useForge } from "~/providers/ForgeProvider";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Trash2 } from "lucide-react";
import type {
  WorkflowNode,
  WorkflowNodeType,
  PluginNode,
  CodeNode,
  IfNode,
  LoopNode,
  SubWorkflowNode,
  HttpNode,
  EventNode,
} from "../../types/workflow-types";
import { LucideIconRenderer } from "../../../../../components/LucideIconRenderer";

export type ActionNodeData = WorkflowNode & Record<string, unknown>;
export type ActionNodeType = Node<ActionNodeData, "action">;

import { StatusIndicator } from "./shared/StatusIndicator";
import { RunningOverlay } from "./shared/RunningOverlay";
import { STATUS_RING, type ExecutionStatus } from "./shared/execution-styles";

// ──────────── Style map per node type ────────────
const NODE_STYLE: Record<
  string,
  { icon: string; color: string; bg: string; badge: string }
> = {
  plugin: {
    icon: "box",
    color: "text-accent-foreground",
    bg: "bg-background",
    badge: "PLUGIN",
  },
  code: {
    icon: "code-2",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    badge: "CODE",
  },
  if: {
    icon: "git-branch",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    badge: "IF / ELSE",
  },
  loop: {
    icon: "repeat",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    badge: "LOOP",
  },
  subworkflow: {
    icon: "workflow",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    badge: "SUB-WORKFLOW",
  },
  http: {
    icon: "globe",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    badge: "HTTP",
  },
  event: {
    icon: "zap",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    badge: "EVENT",
  },
};

// ──────────── Per‑type body renderers ────────────

const PluginBody = ({
  data,
  pluginName,
}: {
  data: PluginNode;
  pluginName?: string;
}) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || pluginName || "Plugin Action"}
    </span>
    {data.params && Object.keys(data.params).length > 0 && (
      <div className="flex flex-col gap-1 mt-1">
        {Object.entries(data.params)
          .slice(0, 3)
          .map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between text-[10px] text-muted-foreground"
            >
              <span className="truncate max-w-[100px]">{key}:</span>
              <span className="truncate max-w-[150px] font-mono bg-muted/50 px-1 rounded">
                {String(value)}
              </span>
            </div>
          ))}
        {Object.keys(data.params).length > 3 && (
          <span className="text-[10px] text-muted-foreground/70 italic mt-1">
            +{Object.keys(data.params).length - 3} more
          </span>
        )}
      </div>
    )}
  </>
);

const CodeBody = ({ data }: { data: CodeNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Code Block"}
    </span>
    <div className="mt-1 p-2 bg-muted/30 rounded-md border border-border/30 max-h-[60px] overflow-hidden">
      <pre className="text-[9px] font-mono text-muted-foreground leading-tight whitespace-pre-wrap break-all">
        {data.script
          ? data.script.substring(0, 120) +
            (data.script.length > 120 ? "..." : "")
          : "// empty script"}
      </pre>
    </div>
  </>
);

const IfBody = ({ data }: { data: IfNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Conditional"}
    </span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-medium">
        CONDITION:
      </span>
      <code className="text-[10px] font-mono bg-violet-500/5 text-violet-400 px-2 py-1 rounded border border-violet-500/10 truncate block">
        {data.condition || "—"}
      </code>
    </div>
  </>
);

const LoopBody = ({ data }: { data: LoopNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Loop / ForEach"}
    </span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-medium">
        COLLECTION:
      </span>
      <code className="text-[10px] font-mono bg-cyan-500/5 text-cyan-400 px-2 py-1 rounded border border-cyan-500/10 truncate block">
        {data.collection || "—"}
      </code>
    </div>
    <div className="mt-1 flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground">
        Max: <strong>{data.maxIterations || 1000}</strong> iterations
      </span>
    </div>
  </>
);

const SubWorkflowBody = ({ data }: { data: SubWorkflowNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Sub-Workflow"}
    </span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground font-medium">
        TARGET WORKFLOW:
      </span>
      <code className="text-[10px] font-mono bg-rose-500/5 text-rose-400 px-2 py-1 rounded border border-rose-500/10 truncate block">
        {data.workflowId || "not configured"}
      </code>
    </div>
    {data.inputMapping && Object.keys(data.inputMapping).length > 0 && (
      <div className="mt-1 flex flex-col gap-0.5">
        {Object.entries(data.inputMapping)
          .slice(0, 2)
          .map(([key, value]) => (
            <span
              key={key}
              className="text-[9px] text-muted-foreground truncate"
            >
              {key} ← {value}
            </span>
          ))}
      </div>
    )}
  </>
);

const HttpBody = ({ data }: { data: HttpNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "HTTP Request"}
    </span>
    <div className="mt-1 flex items-center gap-2">
      <span className="text-[10px] font-black px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20 shrink-0">
        {data.method || "GET"}
      </span>
      <code className="text-[10px] font-mono text-muted-foreground truncate">
        {data.url || "https://..."}
      </code>
    </div>
  </>
);

const EventBody = ({ data }: { data: EventNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Emit Event"}
    </span>
    <div className="mt-1">
      <code className="text-[10px] font-mono bg-yellow-500/5 text-yellow-400 px-2 py-1 rounded border border-yellow-500/10 block truncate">
        {data.eventName || "event.name"}
      </code>
    </div>
  </>
);



// ──────────── Main Renderer ────────────

export const ActionNodeRenderer = ({ id, data }: NodeProps<ActionNodeType>) => {
  const { plugins } = useForge();
  const { deleteElements } = useReactFlow();

  // Execution status injected by WorkflowEditor via nodeStatuses
  const executionStatus = ((data as any)._executionStatus ??
    "idle") as ExecutionStatus;

  // Determine node type with robust fallbacks for older workflow versions
  const dataAsAny = data as any;
  const nodeType = (dataAsAny.type ||
    (dataAsAny.condition !== undefined
      ? "if"
      : dataAsAny.script !== undefined
        ? "code"
        : dataAsAny.collection !== undefined
          ? "loop"
          : dataAsAny.workflowId !== undefined
            ? "subworkflow"
            : "plugin")) as WorkflowNodeType;
  const style = NODE_STYLE[nodeType] || NODE_STYLE.plugin;

  // Plugin-specific data
  const pluginData = nodeType === "plugin" ? (data as PluginNode) : null;
  const plugin = pluginData
    ? plugins.find((p) => p.id === pluginData.pluginId)
    : null;

  const icon = plugin?.manifest.metadata.icon || style.icon;

  const subtitle = (() => {
    switch (nodeType) {
      case "code":
        return "JavaScript";
      case "if":
        return "Conditional Branch";
      case "loop":
        return "Loop / ForEach";
      case "subworkflow":
        return "Sub-Workflow";
      case "http":
        return "HTTP Request";
      case "event":
        return "Emit Event";
      default:
        return pluginData?.action || "Action";
    }
  })();

  const handleDelete = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="group relative">
      <NodeToolbar
        isVisible={undefined} // defaults to "only on hover"
        position={Position.Bottom}
        offset={12}
        className="flex items-center gap-1"
      >
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-destructive/90 backdrop-blur-md shadow-lg border border-border/50 rounded-xl hover:bg-destructive hover:scale-110 transition-all duration-300 group-hover:animate-in group-hover:zoom-in-50"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </NodeToolbar>

      {/* ── Target Handle (input) ── */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-muted-foreground border-2 border-background z-10"
      />

      {/* ID Badge */}
      <div className="absolute -top-3 left-4 z-20">
        <div className="bg-background/80 border border-border/50 text-muted-foreground text-[14px] font-black font-mono px-1.5 py-0.5 rounded">
          {id}
        </div>
      </div>

      <Card
        className={`w-[300px] shadow-sm border-border bg-card transition-all duration-300 ${STATUS_RING[executionStatus]}`}
      >
        <CardContent className="flex flex-col p-0 overflow-hidden rounded-lg relative">
          {/* Header */}
          <div
            className={`flex items-center gap-3 p-3 bg-accent/30 border-b border-border/50 transition-all ${executionStatus === "running" ? "blur-[1px] opacity-50" : ""}`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 p-2 rounded-md border border-border shrink-0 ${style.bg}`}
            >
              <LucideIconRenderer
                name={icon}
                className={style.color}
                size={22}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate text-foreground">
                  {plugin
                    ? plugin.manifest.metadata.name
                    : data.name || style.badge}
                </span>
                {nodeType !== "plugin" && (
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider ${style.bg} ${style.color} border border-current/10`}
                  >
                    {style.badge}
                  </span>
                )}
                {/* Execution status indicator */}
                <StatusIndicator status={executionStatus} />
              </div>
              <span className="text-xs truncate text-muted-foreground">
                {subtitle}
              </span>
            </div>
          </div>

          {/* Running Overlay */}
          {executionStatus === "running" && <RunningOverlay />}

          {/* Body — per-type content */}
          <div
            className={`flex flex-col p-3 gap-1 bg-background transition-all ${executionStatus === "running" ? "blur-[1px] opacity-50" : ""}`}
          >
            {nodeType === "plugin" && pluginData && (
              <PluginBody
                data={pluginData}
                pluginName={plugin?.manifest.metadata.name}
              />
            )}
            {nodeType === "code" && <CodeBody data={data as CodeNode} />}
            {nodeType === "if" && <IfBody data={data as IfNode} />}
            {nodeType === "loop" && <LoopBody data={data as LoopNode} />}
            {nodeType === "subworkflow" && (
              <SubWorkflowBody data={data as SubWorkflowNode} />
            )}
            {nodeType === "http" && <HttpBody data={data as HttpNode} />}
            {nodeType === "event" && <EventBody data={data as EventNode} />}
          </div>
        </CardContent>
      </Card>

      {/* ── Source Handles (output) ── */}
      {nodeType === "if" ? (
        <>
          {/* "then" handle — top-right, green */}
          <div className="absolute right-[-14px] top-[35%] -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
              TRUE
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="then"
              className="w-3.5 h-3.5 border-2 border-background z-10 pointer-events-auto"
              style={{ backgroundColor: "#10b981", position: "static" }}
            />
          </div>
          {/* "else" handle — bottom-right, red */}
          <div className="absolute right-[-14px] top-[65%] -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-1 rounded border border-red-500/20">
              FALSE
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="else"
              className="w-3.5 h-3.5 border-2 border-background z-10 pointer-events-auto"
              style={{ backgroundColor: "#ef4444", position: "static" }}
            />
          </div>
        </>
      ) : nodeType === "loop" ? (
        <>
          {/* "loop-body" handle — top-right, cyan */}
          <div className="absolute right-[-14px] top-[35%] -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <span className="text-[8px] font-black text-cyan-500 bg-cyan-500/10 px-1 rounded border border-cyan-500/20">
              BODY
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="loop-body"
              className="w-3.5 h-3.5 border-2 border-background z-10 pointer-events-auto"
              style={{ backgroundColor: "#06b6d4", position: "static" }}
            />
          </div>
          {/* "loop-done" handle — bottom-right, default */}
          <div className="absolute right-[-14px] top-[65%] -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <span className="text-[8px] font-black text-muted-foreground bg-muted/10 px-1 rounded border border-muted-foreground/20">
              DONE
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="loop-done"
              className="w-3.5 h-3.5 border-2 border-background z-10 pointer-events-auto"
              style={{ backgroundColor: "#94a3b8", position: "static" }}
            />
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-muted-foreground border-2 border-background z-10"
        />
      )}
    </div>
  );
};
