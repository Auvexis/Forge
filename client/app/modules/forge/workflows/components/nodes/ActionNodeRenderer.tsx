import { memo, useCallback } from "react";
import {
  type NodeProps,
  type Node,
  NodeToolbar,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { useForge } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";
import { BaseNode } from "~/components/base-node";
import { BaseHandle } from "~/components/base-handle";
import { LucideIconRenderer } from "~/components/LucideIconRenderer";
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
import { NodeRunningShimmer } from "./NodeRunningShimmer";

export type ActionNodeData = WorkflowNode & Record<string, unknown>;
export type ActionNodeType = Node<ActionNodeData, "action">;

type ExecutionStatus = "idle" | "running" | "success" | "failed";

// Status ring — no glow, just ring
const STATUS_RING: Record<ExecutionStatus, string> = {
  idle:    "",
  running: "ring-2 ring-nod8-workflow-node-status-running-ring",
  success: "ring-2 ring-nod8-workflow-node-status-success-ring",
  failed:  "ring-2 ring-nod8-workflow-node-status-failed-ring",
};

const StatusDot = ({ status }: { status: ExecutionStatus }) => {
  if (status === "idle") return null;
  const color = {
    running: "bg-nod8-workflow-node-status-running-dot",
    success: "bg-nod8-workflow-node-status-success-dot",
    failed:  "bg-nod8-workflow-node-status-failed-dot",
  }[status];
  return (
    <span
      className={cn(
        "shrink-0 w-2 h-2 rounded-full",
        color,
        status === "running" && "animate-pulse",
      )}
    />
  );
};

// Style map per node type
const NODE_STYLE: Record<
  string,
  { icon: string; color: string; bg: string; badge: string }
> = {
  plugin:      { icon: "box",        color: "text-foreground/70",  bg: "bg-accent",            badge: "PLUGIN"       },
  code:        { icon: "code-2",     color: "text-amber-400",      bg: "bg-amber-500/10",      badge: "CODE"         },
  if:          { icon: "git-branch", color: "text-violet-400",     bg: "bg-violet-500/10",     badge: "IF / ELSE"    },
  loop:        { icon: "repeat",     color: "text-cyan-400",       bg: "bg-cyan-500/10",       badge: "LOOP"         },
  subworkflow: { icon: "workflow",   color: "text-rose-400",       bg: "bg-rose-500/10",       badge: "SUB-WORKFLOW" },
  http:        { icon: "globe",      color: "text-orange-400",     bg: "bg-orange-500/10",     badge: "HTTP"         },
  event:       { icon: "zap",        color: "text-yellow-400",     bg: "bg-yellow-500/10",     badge: "EVENT"        },
};

// Body components
const PluginBody = memo(({ data, pluginName }: { data: PluginNode; pluginName?: string }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || pluginName || "Plugin Action"}
    </span>
    {data.params && Object.keys(data.params).length > 0 && (
      <div className="flex flex-col gap-1 mt-1">
        {Object.entries(data.params).slice(0, 3).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[100px]">{key}:</span>
            <span className="truncate max-w-[150px] font-mono bg-muted/50 px-1 rounded text-xs">
              {String(value)}
            </span>
          </div>
        ))}
        {Object.keys(data.params).length > 3 && (
          <span className="text-xs text-muted-foreground/60 italic">
            +{Object.keys(data.params).length - 3} more
          </span>
        )}
      </div>
    )}
  </>
));
PluginBody.displayName = "PluginBody";

const CodeBody = memo(({ data }: { data: CodeNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">{data.name || "Code Block"}</span>
    <div className="mt-1 p-2 bg-muted/30 rounded border border-border/30 max-h-[60px] overflow-hidden">
      <pre className="text-xs font-mono text-muted-foreground leading-tight whitespace-pre-wrap break-all">
        {data.script ? data.script.substring(0, 120) + (data.script.length > 120 ? "…" : "") : "// empty script"}
      </pre>
    </div>
  </>
));
CodeBody.displayName = "CodeBody";

const IfBody = memo(({ data }: { data: IfNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">{data.name || "Conditional"}</span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">Condition:</span>
      <code className="text-xs font-mono bg-violet-500/5 text-violet-400 px-2 py-1 rounded border border-violet-500/10 truncate block">
        {data.condition || "—"}
      </code>
    </div>
  </>
));
IfBody.displayName = "IfBody";

const LoopBody = memo(({ data }: { data: LoopNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">{data.name || "Loop / ForEach"}</span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">Collection:</span>
      <code className="text-xs font-mono bg-cyan-500/5 text-cyan-400 px-2 py-1 rounded border border-cyan-500/10 truncate block">
        {data.collection || "—"}
      </code>
    </div>
    <span className="text-xs text-muted-foreground mt-1">
      Max: <strong>{data.maxIterations || 1000}</strong> iterations
    </span>
  </>
));
LoopBody.displayName = "LoopBody";

const SubWorkflowBody = memo(({ data }: { data: SubWorkflowNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">{data.name || "Sub-Workflow"}</span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">Target:</span>
      <code className="text-xs font-mono bg-rose-500/5 text-rose-400 px-2 py-1 rounded border border-rose-500/10 truncate block">
        {data.workflowId || "not configured"}
      </code>
    </div>
  </>
));
SubWorkflowBody.displayName = "SubWorkflowBody";

const HttpBody = memo(({ data }: { data: HttpNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-semibold px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20 shrink-0">
      {data.method || "GET"}
    </span>
    <code className="text-xs font-mono text-muted-foreground truncate">
      {data.url || "https://…"}
    </code>
  </div>
));
HttpBody.displayName = "HttpBody";

const EventBody = memo(({ data }: { data: EventNode }) => (
  <code className="text-xs font-mono bg-yellow-500/5 text-yellow-400 px-2 py-1 rounded border border-yellow-500/10 block truncate">
    {data.eventName || "event.name"}
  </code>
));
EventBody.displayName = "EventBody";

// Main Renderer
export const ActionNodeRenderer = memo(({ id, data }: NodeProps<ActionNodeType>) => {
  const { plugins } = useForge();
  const { deleteElements } = useReactFlow();

  const executionStatus = ((data as any)._executionStatus ?? "idle") as ExecutionStatus;

  const dataAsAny = data as any;
  const nodeType = (dataAsAny.type || (
    dataAsAny.condition   !== undefined ? "if"          :
    dataAsAny.script      !== undefined ? "code"        :
    dataAsAny.collection  !== undefined ? "loop"        :
    dataAsAny.workflowId  !== undefined ? "subworkflow" :
    "plugin"
  )) as WorkflowNodeType;

  const style    = NODE_STYLE[nodeType] ?? NODE_STYLE.plugin;
  const pluginData = nodeType === "plugin" ? (data as PluginNode) : null;
  const plugin     = pluginData ? plugins.find((p) => p.id === pluginData.pluginId) : null;
  const icon       = plugin?.manifest.metadata.icon ?? style.icon;

  const subtitle = (() => {
    switch (nodeType) {
      case "code":        return "JavaScript";
      case "if":          return "Conditional Branch";
      case "loop":        return "Loop / ForEach";
      case "subworkflow": return "Sub-Workflow";
      case "http":        return "HTTP Request";
      case "event":       return "Emit Event";
      default:            return pluginData?.action || "Action";
    }
  })();

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const isIf   = nodeType === "if";
  const isLoop = nodeType === "loop";

  return (
    <div className="relative">
      {/* Delete toolbar */}
      <NodeToolbar position={Position.Bottom} offset={10} className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="nodrag h-7 w-7 rounded-md shadow-sm"
          onClick={handleDelete}
          aria-label="Delete node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </NodeToolbar>

      {/* Target handle */}
      <BaseHandle id="target" type="target" position={Position.Left} />

      {/* ID Badge */}
      <div className="absolute -top-[21.55px] left-3 z-10">
        <span className="bg-nod8-rf-node-header-bg border border-b-0! border-border text-muted-foreground text-xs font-mono px-1.5 py-0.5 rounded-sm! rounded-b-none!">
          {id}
        </span>
      </div>

      {/* Node card */}
      <BaseNode
        className={cn(
          "min-w-[240px] max-w-[340px] p-0 overflow-hidden shadow-sm transition-colors duration-150",
          STATUS_RING[executionStatus],
        )}
      >
        {executionStatus === "running" && <NodeRunningShimmer />}

        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 bg-nod8-rf-node-header-bg border-b border-border",
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md border border-border shrink-0",
              style.bg,
            )}
          >
            <LucideIconRenderer name={icon} className={style.color} size={16} />
          </div>

          {/* Title + subtitle */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate text-foreground">
                {plugin ? plugin.manifest.metadata.name : data.name || style.badge}
              </span>
              {nodeType !== "plugin" && (
                <span
                  className={cn(
                    "text-xs px-1 py-px rounded font-semibold shrink-0",
                    style.bg, style.color,
                  )}
                >
                  {style.badge}
                </span>
              )}
              <StatusDot status={executionStatus} />
            </div>
            <span className="text-xs truncate text-muted-foreground">{subtitle}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col p-3 gap-1 bg-card">
          {nodeType === "plugin"      && pluginData && <PluginBody data={pluginData} pluginName={plugin?.manifest.metadata.name} />}
          {nodeType === "code"        && <CodeBody        data={data as CodeNode}        />}
          {nodeType === "if"          && <IfBody          data={data as IfNode}          />}
          {nodeType === "loop"        && <LoopBody        data={data as LoopNode}        />}
          {nodeType === "subworkflow" && <SubWorkflowBody data={data as SubWorkflowNode} />}
          {nodeType === "http"        && <HttpBody        data={data as HttpNode}        />}
          {nodeType === "event"       && <EventBody       data={data as EventNode}       />}
        </div>
      </BaseNode>

      {/* Source handles */}
      {isIf ? (
        <>
          <BaseHandle id="then" type="source" position={Position.Right} style={{ top: "35%" }}
            className="!border-emerald-500/50 !bg-emerald-900 hover:!bg-emerald-500 hover:!border-emerald-500"
          />
          <span className="absolute right-[18px] top-[35%] -translate-y-1/2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-1 rounded border border-emerald-500/20 pointer-events-none z-10">
            TRUE
          </span>
          <BaseHandle id="else" type="source" position={Position.Right} style={{ top: "65%" }}
            className="!border-red-500/50 !bg-red-900 hover:!bg-red-500 hover:!border-red-500"
          />
          <span className="absolute right-[18px] top-[65%] -translate-y-1/2 text-xs font-semibold text-red-500 bg-red-500/10 px-1 rounded border border-red-500/20 pointer-events-none z-10">
            FALSE
          </span>
        </>
      ) : isLoop ? (
        <>
          <BaseHandle id="loop-body" type="source" position={Position.Right} style={{ top: "35%" }}
            className="!border-cyan-500/50 !bg-cyan-500/20 hover:!bg-cyan-500 hover:!border-cyan-500"
          />
          <span className="absolute right-[18px] top-[35%] -translate-y-1/2 text-xs font-semibold text-cyan-500 bg-cyan-500/10 px-1 rounded border border-cyan-500/20 pointer-events-none z-10">
            BODY
          </span>
          <BaseHandle id="loop-done" type="source" position={Position.Right} style={{ top: "65%" }} />
          <span className="absolute right-[18px] top-[65%] -translate-y-1/2 text-xs font-semibold text-muted-foreground bg-muted/30 px-1 rounded border border-border pointer-events-none z-10">
            DONE
          </span>
        </>
      ) : (
        <BaseHandle id="source" type="source" position={Position.Right} />
      )}
    </div>
  );
});

ActionNodeRenderer.displayName = "ActionNodeRenderer";
