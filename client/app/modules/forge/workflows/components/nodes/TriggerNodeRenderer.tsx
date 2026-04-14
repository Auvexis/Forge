import { memo } from "react";
import { type NodeProps, type Node, Position } from "@xyflow/react";
import { Play, Webhook, Clock, Zap, Target } from "lucide-react";
import { cn } from "~/lib/utils";

import { BaseNode } from "~/components/base-node";
import { BaseHandle } from "~/components/base-handle";

import type { WorkflowTrigger } from "../../types/workflow-types";

// ──────────── Types ────────────

export type TriggerNodeData = WorkflowTrigger & Record<string, unknown>;
export type TriggerNodeType = Node<TriggerNodeData, "trigger">;

type ExecutionStatus = "idle" | "running" | "success" | "failed";

// ──────────── Status helpers ────────────

const STATUS_RING: Record<ExecutionStatus, string> = {
  idle:    "",
  running: "ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)]",
  success: "ring-2 ring-emerald-500/70 shadow-[0_0_14px_2px_rgba(16,185,129,0.25)]",
  failed:  "ring-2 ring-red-500/70 shadow-[0_0_14px_2px_rgba(239,68,68,0.25)]",
};

const StatusDot = ({ status }: { status: ExecutionStatus }) => {
  if (status === "idle") return null;
  const color = {
    running: "bg-amber-400",
    success: "bg-emerald-400",
    failed:  "bg-red-400",
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

const RunningOverlay = () => (
  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/8 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
  </div>
);

// ──────────── Trigger config ────────────

const TRIGGER_CONFIG = {
  manual:  { icon: Play,    title: "Manual Trigger",  color: "text-blue-400",    bg: "bg-blue-500/10"    },
  webhook: { icon: Webhook, title: "Webhook",          color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cron:    { icon: Clock,   title: "Schedule / Cron", color: "text-amber-400",   bg: "bg-amber-500/10"   },
  event:   { icon: Zap,     title: "Event Trigger",   color: "text-purple-400",  bg: "bg-purple-500/10"  },
} as const;

const DEFAULT_TRIGGER = {
  icon: Target,
  title: "Trigger",
  color: "text-foreground",
  bg: "bg-accent",
} as const;

// ──────────── Component ────────────

export const TriggerNodeRenderer = memo(({ id, data }: NodeProps<TriggerNodeType>) => {
  const executionStatus = ((data as any)._executionStatus ?? "idle") as ExecutionStatus;
  const isRunning = executionStatus === "running";

  const { icon: Icon, title, color, bg } =
    TRIGGER_CONFIG[data.type as keyof typeof TRIGGER_CONFIG] ?? DEFAULT_TRIGGER;

  return (
    <div className="relative">
      {/* ID Badge */}
      <div className="absolute -top-5 left-3 z-10">
        <span className="bg-background/80 border border-border/50 text-muted-foreground text-[10px] font-black font-mono px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
          {id}
        </span>
      </div>

      {/* Node card */}
      <BaseNode
        className={cn(
          "min-w-[260px] max-w-[360px] p-0 overflow-hidden shadow-sm transition-all duration-300",
          STATUS_RING[executionStatus],
        )}
      >
        {/* Running shimmer */}
        {isRunning && <RunningOverlay />}

        {/* ── Header ── */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 bg-accent/30 border-b border-border/50 transition-all duration-300",
            isRunning && "opacity-80",
          )}
        >
          {/* Icon badge */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 p-2 rounded-lg border border-border shrink-0",
              bg,
            )}
          >
            <Icon className={cn("w-5 h-5", color)} />
          </div>

          {/* Title + subtitle */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate text-foreground">{title}</span>
              <StatusDot status={executionStatus} />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-tight text-muted-foreground">
              Workflow Entry Point
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className={cn(
            "flex flex-col p-3 bg-background/60 transition-all duration-300",
            isRunning && "opacity-60",
          )}
        >
          {data.type === "webhook" && data.webhookPath ? (
            <code className="text-[10px] font-mono text-emerald-400/80 truncate block">
              /webhooks/{data.webhookPath}
            </code>
          ) : data.type === "cron" && data.cronExpression ? (
            <code className="text-[10px] font-mono text-amber-400/80">
              {data.cronExpression}
            </code>
          ) : data.type === "event" && data.eventName ? (
            <code className="text-[10px] font-mono text-purple-400/80">
              {data.eventName}
            </code>
          ) : data.type === "manual" &&
            data.schema &&
            Object.keys(data.schema).length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                Expected Inputs:
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.keys(data.schema).map((key) => (
                  <span
                    key={key}
                    className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border/50"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic">
              {data.type === "manual"
                ? "Standard manual execution."
                : `Waiting for ${data.type} signal…`}
            </span>
          )}
        </div>
      </BaseNode>

      {/* Source handle — triggers only output */}
      <BaseHandle id="source" type="source" position={Position.Right} />
    </div>
  );
});

TriggerNodeRenderer.displayName = "TriggerNodeRenderer";
