import { memo, type FC } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Play,
  Trash2,
  Edit2,
  Loader2,
  Calendar,
  Activity,
  Download,
  Zap,
  Clock,
  Layers,
  Variable,
  Hash,
  Globe,
  Lock,
} from "lucide-react";
import type { WorkflowItem } from "../types/workflow-types";
import { cn } from "~/lib/utils";

function getRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

interface Props {
  workflow: WorkflowItem;
  isExecuting: boolean;
  onEdit: () => void;
  onRun: () => void;
  onLogs: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const TRIGGER_ICON = {
  manual:  Play,
  webhook: Zap,
  cron:    Clock,
  event:   Activity,
} as const;

const TRIGGER_LABEL = {
  manual:  "Manual",
  webhook: "Webhook",
  cron:    "Scheduled",
  event:   "Event",
} as const;

export const WorkflowModuleCard: FC<Props> = memo(({
  workflow,
  isExecuting,
  onEdit,
  onRun,
  onLogs,
  onDelete,
}) => {
  const nodeCount     = Object.keys(workflow.nodes || {}).length;
  const variableCount = workflow.variables?.length || 0;
  const edgeCount     = workflow.edges?.length || 0;

  const triggerType = workflow.trigger?.type as keyof typeof TRIGGER_ICON;
  const TriggerIcon  = TRIGGER_ICON[triggerType] || Zap;
  const triggerLabel = TRIGGER_LABEL[triggerType] || "Trigger";

  return (
    <div
      onClick={onEdit}
      className="group flex flex-col bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-border/80 hover:bg-card/80 transition-colors"
    >
      {/* Top meta row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Status */}
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border",
              workflow.metadata.isActive
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-amber-500/10 border-amber-500/20 text-amber-500",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                workflow.metadata.isActive ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            {workflow.metadata.isActive ? "Active" : "Draft"}
          </span>

          {/* Visibility */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {workflow.metadata.public ? (
              <Globe className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            {workflow.metadata.public ? "Public" : "Private"}
          </span>
        </div>

        <span className="text-xs font-mono text-muted-foreground/50">
          #{workflow.metadata.id.slice(0, 8)}
        </span>
      </div>

      {/* Title + description */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg border border-border flex items-center justify-center shrink-0 bg-accent",
            isExecuting && "border-amber-500/40",
          )}
        >
          <TriggerIcon
            className={cn(
              "w-4 h-4",
              isExecuting ? "text-amber-400" : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {workflow.metadata.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
            {workflow.metadata.description || "No description."}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Layers,   label: "Nodes", value: nodeCount     },
          { icon: Variable, label: "Vars",  value: variableCount },
          { icon: Hash,     label: "Edges", value: edgeCount     },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 p-2 rounded-md bg-accent border border-border/50"
          >
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <Icon className="w-3 h-3" />
              <span className="text-xs">{label}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground/50">Last modified</span>
          <span className="text-xs text-muted-foreground">
            {workflow.metadata.updatedAt
              ? getRelativeTime(new Date(workflow.metadata.updatedAt))
              : getRelativeTime(new Date(workflow.metadata.createdAt))}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onLogs(); }}
            className="h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Calendar className="w-3 h-3" />
            Logs
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={isExecuting}
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs gap-1.5",
              isExecuting
                ? "text-amber-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isExecuting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            {isExecuting ? "Running" : "Run"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[180px] rounded-lg p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="gap-2 text-sm rounded-md cursor-pointer"
                onClick={onEdit}
              >
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-sm rounded-md cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const blob = new Blob([JSON.stringify(workflow, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${workflow.metadata.name.replace(/\s+/g, "_").toLowerCase()}_v${workflow.metadata.version}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                Export JSON
              </DropdownMenuItem>
              <div className="h-px bg-border my-1 mx-1" />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-sm rounded-md cursor-pointer text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

WorkflowModuleCard.displayName = "WorkflowModuleCard";
