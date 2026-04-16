import {
  Play,
  Plus,
  Save,
  X,
  Settings,
  Loader2,
  Activity,
  Download,
  Square,
  ChevronDown,
  Workflow,
  Clock,
  Layers,
  Zap,
  WorkflowIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import type { WorkflowItem } from "../types/workflow-types";
import type { DockSection } from "~/shared/components/ForgeDock";

// ── helpers ──────────────────────────────────────────────────────────────────

function getRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

const TRIGGER_ICON: Record<string, React.ElementType> = {
  manual: Play,
  webhook: Zap,
  cron: Clock,
  event: Activity,
};

// ── types ────────────────────────────────────────────────────────────────────

interface Props {
  workflowName: string;
  workflowId: string;
  onRun: () => void;
  onStop: () => void;
  onAddNode: () => void;
  onSave: () => void;
  onSettings: () => void;
  onLogs: () => void;
  onClose: () => void;
  isSaving: boolean;
  isExecuting: boolean;
  isStreaming: boolean;
  isLogsOpen: boolean;
  isDirty: boolean;
  workflow: any;
  /** All available workflows — for the switcher dropdown */
  workflows?: WorkflowItem[];
  /** Called when user switches to another workflow from the dropdown */
  onSwitchWorkflow?: (id: string) => void;
}

export const WorkflowEditorDock = ({
  workflowName,
  workflowId,
  onRun,
  onStop,
  onAddNode,
  onSave,
  onSettings,
  onLogs,
  onClose,
  isSaving,
  isExecuting,
  isStreaming,
  isLogsOpen,
  isDirty,
  workflow,
  workflows = [],
  onSwitchWorkflow,
}: Props) => {
  const isBusy = isExecuting || isStreaming;

  const statusDot = isStreaming
    ? { color: "bg-nod8-editor-dock-status-streaming", animate: true }
    : isDirty
      ? { color: "bg-nod8-editor-dock-status-dirty", animate: false }
      : { color: "bg-nod8-editor-dock-status-idle", animate: false };

  // ── Brand badge with workflow switcher ──
  const brandBadge = (
    <div className="flex items-center gap-2.5 pr-3 border-r border-nod8-dock-section-border h-full">
      <div className="w-7 h-7 flex items-center justify-center rounded-md bg-nod8-dock-badge-bg shrink-0">
        <WorkflowIcon className="w-3.5 h-3.5 text-nod8-dock-badge-icon" />
      </div>

      {/* Workflow name → dropdown to switch */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-col justify-center items-start group h-auto py-1 px-2 gap-0.5! rounded-md"
          >
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-nod8-workflow-picker-trigger-title group-hover:text-nod8-workflow-picker-trigger-title-hover transition-colors duration-200 leading-none">
                {workflowName}
              </span>
              <ChevronDown className="w-3 h-3 text-nod8-workflow-picker-trigger-title group-hover:text-nod8-workflow-picker-trigger-title-hover transition-colors shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  statusDot.color,
                  statusDot.animate && "animate-pulse",
                )}
              />
              <span className="text-xs text-nod8-workflow-picker-trigger-meta leading-none">
                {isStreaming
                  ? "Running"
                  : isDirty
                    ? "Unsaved changes"
                    : workflowId.slice(0, 14)}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="min-w-[320px] bg-nod8-workflow-picker-menu-bg! rounded-none mt-[4px]! p-1.5"
          sideOffset={6}
        >
          <div className="flex flex-col gap-0.5">
            {workflows.map((wf) => {
              const TriggerIcon = TRIGGER_ICON[wf.trigger?.type] ?? Zap;
              const nodeCount = Object.keys(wf.nodes || {}).length;
              const modified = wf.metadata.updatedAt || wf.metadata.createdAt;
              const isCurrent = wf.metadata.id === workflowId;

              return (
                <DropdownMenuItem
                  key={wf.metadata.id}
                  className="group flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer focus:bg-nod8-workflow-picker-row-hover-bg"
                  onClick={() => onSwitchWorkflow?.(wf.metadata.id)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md border flex items-center justify-center shrink-0 mt-0.5",
                      isCurrent
                        ? "bg-nod8-workflow-picker-icon-tile-active-bg border-nod8-workflow-picker-icon-tile-active-border"
                        : "bg-nod8-workflow-picker-icon-tile-bg border-nod8-workflow-picker-icon-tile-border",
                    )}
                  >
                    <TriggerIcon
                      className={cn(
                        "w-3.5 h-3.5",
                        isCurrent
                          ? "text-nod8-workflow-picker-row-icon-active-text"
                          : "text-nod8-workflow-picker-row-icon-inactive-text",
                      )}
                    />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium truncate",
                          isCurrent
                            ? "text-nod8-workflow-picker-row-title"
                            : "text-nod8-workflow-picker-row-subtitle",
                        )}
                      >
                        {wf.metadata.name}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-1.5 py-px rounded border shrink-0",
                          wf.metadata.isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-500",
                        )}
                      >
                        {wf.metadata.isActive ? "Active" : "Draft"}
                      </span>
                      {isCurrent && (
                        <span className="text-xs px-1.5 py-px rounded border bg-primary/10 border-primary/20 text-primary shrink-0">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {nodeCount} node{nodeCount !== 1 ? "s" : ""}
                      </span>
                      {modified && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(modified)}
                        </span>
                      )}
                      <span className="font-mono opacity-50 truncate max-w-[100px]">
                        {wf.metadata.id.slice(0, 12)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>

          {workflows.length > 0 && <DropdownMenuSeparator className="my-1" />}

          <DropdownMenuItem
            className="gap-2 text-sm focus:bg-nod8-workflow-picker-menu-item-hover-bg rounded-md cursor-pointer font-medium px-3 py-2 text-nod8-workflow-picker-menu-item-text hover:text-nod8-workflow-picker-menu-item-text-hover"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            Close workflow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const sections: DockSection[] = [
    {
      id: "runtime",
      content: (
        <>
          {isStreaming ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="h-7 px-2.5 rounded-md text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1.5 text-xs transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRun}
              disabled={isExecuting}
              className="h-7 px-2.5 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 gap-1.5 text-xs transition-colors"
            >
              {isExecuting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              Run
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogs}
            className={`h-7 px-2.5 rounded-md gap-1.5 text-xs transition-colors ${
              isLogsOpen
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Activity className="w-3 h-3" />
            Logs
          </Button>
        </>
      ),
    },
    {
      id: "architect",
      content: (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddNode}
            disabled={isBusy}
            className="h-7 px-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent gap-1.5 text-xs transition-colors disabled:opacity-40"
          >
            <Plus className="w-3 h-3" />
            Add Node
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Export JSON"
            onClick={() => {
              const blob = new Blob([JSON.stringify(workflow, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${workflowName.replace(/\s+/g, "_").toLowerCase()}_v${workflow.metadata?.version ?? "1.0"}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            title="Workflow settings"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </>
      ),
    },
  ];

  const trailing = (
    <>
      <Button
        onClick={onSave}
        disabled={isSaving || !isDirty || isBusy}
        size="sm"
        variant={isDirty && !isBusy ? "emphasis" : "ghost"}
        className="h-7 mr-5 px-3 text-xs font-medium gap-1.5 rounded-md disabled:opacity-40 transition-colors"
      >
        {isSaving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Save className="w-3 h-3" />
        )}
        {isSaving ? "Saving" : "Save"}
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onClose}
        title="Close editor"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  // Render a customized dock — we override the brand badge area entirely
  return (
    <div className="nod8-dock nod8-dock--editor h-12 w-full flex items-center bg-nod8-dock-bg border-b border-nod8-dock-border shrink-0 px-3 gap-2">
      {brandBadge}

      {sections.map((section) => (
        <div
          key={section.id}
          className={`flex items-center gap-1 h-full px-2 ${
            section.border !== false ? "border-r border-nod8-dock-section-border" : ""
          }`}
        >
          {section.content}
        </div>
      ))}

      <div className="flex-1" />
      <div className="flex items-center gap-2">{trailing}</div>
    </div>
  );
};
