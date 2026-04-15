import { memo } from "react";
import { type NodeProps, type Node, Position } from "@xyflow/react";
import { Play, Webhook, Clock, Zap, Target } from "lucide-react";
import { cn } from "~/lib/utils";
import { BaseNode } from "~/components/base-node";
import { BaseHandle } from "~/components/base-handle";
import type { WorkflowTrigger } from "../../types/workflow-types";
import { NodeRunningShimmer } from "./NodeRunningShimmer";

export type TriggerNodeData = WorkflowTrigger & Record<string, unknown>;
export type TriggerNodeType = Node<TriggerNodeData, "trigger">;

type ExecutionStatus = "idle" | "running" | "success" | "failed";

// Status ring — no glow
const STATUS_RING: Record<ExecutionStatus, string> = {
  idle: "",
  running: "ring-2 ring-forge-workflow-node-status-running-ring",
  success: "ring-2 ring-forge-workflow-node-status-success-ring",
  failed: "ring-2 ring-forge-workflow-node-status-failed-ring",
};

const StatusDot = ({ status }: { status: ExecutionStatus }) => {
  if (status === "idle") return null;
  const color = {
    running: "bg-forge-workflow-node-status-running-dot",
    success: "bg-forge-workflow-node-status-success-dot",
    failed: "bg-forge-workflow-node-status-failed-dot",
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

const TRIGGER_CONFIG = {
  manual: {
    icon: Play,
    title: "Manual Trigger",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  webhook: {
    icon: Webhook,
    title: "Webhook",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  cron: {
    icon: Clock,
    title: "Schedule / Cron",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  event: {
    icon: Zap,
    title: "Event Trigger",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
} as const;

const DEFAULT_TRIGGER = {
  icon: Target,
  title: "Trigger",
  color: "text-foreground",
  bg: "bg-accent",
} as const;

export const TriggerNodeRenderer = memo(
  ({ id, data }: NodeProps<TriggerNodeType>) => {
    const executionStatus = ((data as any)._executionStatus ??
      "idle") as ExecutionStatus;

    const {
      icon: Icon,
      title,
      color,
      bg,
    } = TRIGGER_CONFIG[data.type as keyof typeof TRIGGER_CONFIG] ??
    DEFAULT_TRIGGER;

    return (
      <div className="relative">
        {/* ID Badge */}
        <div className="absolute -top-[21.55px] left-3 z-10">
          <span className="bg-accent border border-b-0! border-border text-muted-foreground text-xs font-mono px-1.5 py-0.5 rounded-sm! rounded-b-none!">
            {id}
          </span>
        </div>

        {/* Node card */}
        <BaseNode
          className={cn(
            "min-w-[250px] max-w-[340px] rounded-l-sm rounded-r-[2rem] p-0 overflow-hidden shadow-sm transition-colors duration-150",
            STATUS_RING[executionStatus],
          )}
        >
          {/* Running shimmer */}
          {executionStatus === "running" && <NodeRunningShimmer />}

          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-accent border-b border-border">
            {/* Icon */}
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md border border-border shrink-0",
                bg,
              )}
            >
              <Icon className={cn("w-4 h-4", color)} />
            </div>

            {/* Title */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate text-foreground">
                  {title}
                </span>
                <StatusDot status={executionStatus} />
              </div>
              <span className="text-xs text-muted-foreground">
                Workflow Entry Point
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col p-3 bg-card">
            {data.type === "webhook" && data.webhookPath ? (
              <code className="text-xs font-mono text-emerald-400/80 truncate block">
                /webhooks/{data.webhookPath}
              </code>
            ) : data.type === "cron" && data.cronExpression ? (
              <code className="text-xs font-mono text-amber-400/80">
                {data.cronExpression}
              </code>
            ) : data.type === "event" && data.eventName ? (
              <code className="text-xs font-mono text-purple-400/80">
                {data.eventName}
              </code>
            ) : data.type === "manual" &&
              data.schema &&
              Object.keys(data.schema).length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium mb-0.5">
                  Expected inputs:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(data.schema).map((key) => (
                    <span
                      key={key}
                      className="text-xs px-1.5 py-0.5 bg-muted rounded border border-border/50"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">
                {data.type === "manual"
                  ? "Standard manual execution."
                  : `Waiting for ${data.type} signal…`}
              </span>
            )}
          </div>
        </BaseNode>

        {/* Source handle */}
        <BaseHandle
          id="source"
          type="source"
          position={Position.Right}
          // style={{ left: "calc(100% - 4px)" }}
        />
      </div>
    );
  },
);

TriggerNodeRenderer.displayName = "TriggerNodeRenderer";
