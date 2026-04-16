import { useEffect, useCallback, useState } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import {
  Plus,
  Loader2,
  Workflow,
  ChevronDown,
  Trash2,
  Clock,
  Layers,
  Zap,
  Play,
  Activity,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useNod8 } from "~/providers/Nod8Provider";
import { useGetWorkflows } from "~/modules/nod8/workflows/hooks/useGetWorkflows";
import { useCreateWorkflow } from "~/modules/nod8/workflows/hooks/useCreateWorkflow";
import { useDeleteWorkflow } from "~/modules/nod8/workflows/hooks/useDeleteWorkflow";
import { WorkflowEditor } from "~/modules/nod8/workflows/components/WorkflowEditor";
import { ImportWorkflowDialog } from "~/modules/nod8/workflows/components/ImportWorkflowDialog";
import { cn } from "~/lib/utils";
import type { WorkflowItem } from "~/modules/nod8/workflows/types/workflow-types";
import { useConfirm } from "~/providers/ConfirmProvider";

// ── Helper ────────────────────────────────────────────────────────────────────

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

// ── Workflow dropdown item ────────────────────────────────────────────────────

const WorkflowDropdownItem = ({
  wf,
  isCurrent,
  onSelect,
  onDelete,
}: {
  wf: WorkflowItem;
  isCurrent?: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => {
  const TriggerIcon = TRIGGER_ICON[wf.trigger?.type] ?? Zap;
  const nodeCount = Object.keys(wf.nodes || {}).length;
  const modified = wf.metadata.updatedAt || wf.metadata.createdAt;

  return (
    <DropdownMenuItem
      className="group flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer focus:bg-nod8-workflow-picker-row-hover-bg"
      onClick={onSelect}
    >
      {/* Trigger type icon */}
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

      {/* Info */}
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
            <span className="text-xs px-1.5 py-px rounded border bg-nod8-workflow-picker-badge-bg border-nod8-workflow-picker-badge-border text-nod8-workflow-picker-badge-text shrink-0">
              Open
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
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
          <span className="font-mono opacity-50 truncate max-w-[80px]">
            {wf.metadata.id.slice(0, 12)}
          </span>
        </div>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </DropdownMenuItem>
  );
};

// ── Empty canvas shown when no workflow is open ───────────────────────────────

const EmptyCanvas = ({
  workflows,
  loading,
  onCreate,
  creating,
  onDelete,
  onRefresh,
}: {
  workflows: WorkflowItem[];
  loading: boolean;
  onCreate: () => void;
  creating: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
}) => {
  const { setSelectedWorkflowId } = useNod8();
  const [showingImportDialog, setShowingImportDialog] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Dock */}
      <div
        data-accent="primary"
        className="nod8-dock nod8-dock--workflows h-12 w-full flex items-center gap-2 px-3 bg-nod8-dock-bg border-b border-nod8-dock-border shrink-0"
      >
        {/* Brand badge */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-nod8-dock-section-border h-full shrink-0">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-nod8-dock-badge-bg shrink-0">
            <Workflow className="w-3.5 h-3.5 text-nod8-dock-badge-icon" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-foreground leading-none">
              Workflows
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nod8-dock-status-dot-primary" />
              <span className="text-xs text-muted-foreground leading-none">
                {loading
                  ? "Loading..."
                  : `${workflows.length} Workflow${workflows.length !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>

        {/* Workflow Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="ml-2">
            <Button
              variant="ghost"
              className="flex flex-col justify-center group h-auto py-1 px-2 rounded-md"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-nod8-workflow-picker-trigger-title group-hover:text-nod8-workflow-picker-trigger-title-hover transition-colors leading-none">
                  Open workflow...
                </span>
                <ChevronDown className="w-3 h-3 text-nod8-workflow-picker-trigger-title group-hover:text-nod8-workflow-picker-trigger-title-hover transition-colors shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-nod8-dock-status-dot-primary" />
                <span className="text-xs text-nod8-workflow-picker-trigger-meta leading-none">
                  {loading ? "Loading..." : "None selected"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="min-w-[320px] bg-nod8-workflow-picker-menu-bg rounded-none mt-[5px]! p-1.5"
            sideOffset={6}
          >
            {workflows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-6 text-nod8-workflow-picker-trigger-meta">
                <Workflow className="w-8 h-8 opacity-20" />
                <p className="text-xs text-center">
                  No workflows yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 w-full">
                {workflows.map((wf) => (
                  <WorkflowDropdownItem
                    key={wf.metadata.id}
                    wf={wf}
                    onSelect={() => setSelectedWorkflowId(wf.metadata.id)}
                    onDelete={(e) => onDelete(wf.metadata.id, e)}
                  />
                ))}
              </div>
            )}

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2 text-sm focus:bg-nod8-workflow-picker-menu-item-hover-bg rounded-md cursor-pointer font-medium px-3 py-2 text-nod8-workflow-picker-menu-item-text hover:text-nod8-workflow-picker-menu-item-text-hover"
              onClick={onCreate}
            >
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              New Workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            title="Refresh workflows"
            // Note: Since getting workflows is managed globally in WorkflowsView, we can just trigger a simple re-fetch if we wire it up, but for now we'll do a simple reload or nothing since it's just visual completeness.
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Import Workflow */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setShowingImportDialog(true)}
          >
            <Upload className="w-3 h-3" />
            Import
          </Button>

          {/* Create Workflow */}
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-2 text-sm font-medium rounded-md"
            onClick={onCreate}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            New Workflow
          </Button>
        </div>
      </div>

      {/* Empty ReactFlow canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Center hint */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-accent border border-border flex items-center justify-center opacity-30">
              <Workflow className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <p className="text-sm font-medium text-foreground">
                No workflow open
              </p>
              <p className="text-xs text-muted-foreground">
                Open a workflow from the menu above or create a new one.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showingImportDialog && (
        <ImportWorkflowDialog
          onClose={() => setShowingImportDialog(false)}
          onImported={() => {
            onRefresh();
            setShowingImportDialog(false);
          }}
        />
      )}
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────

export const WorkflowsView = () => {
  const { selectedWorkflowId, setSelectedWorkflowId } = useNod8();

  // Single source of truth — only ONE getWorkflows instance
  const { workflows, loading, getWorkflows } = useGetWorkflows();
  const { createWorkflow, loading: creating } = useCreateWorkflow();
  const { deleteWorkflow } = useDeleteWorkflow();
  const confirm = useConfirm();

  useEffect(() => {
    getWorkflows();
  }, []);

  const handleCreate = useCallback(async () => {
    const newId = `wf_${Date.now()}`;
    const newWorkflow: WorkflowItem = {
      metadata: {
        id: newId,
        name: "New Workflow",
        description: "",
        version: "1.0",
        isActive: false,
        isDraft: true,
        public: false,
        createdAt: new Date().toISOString(),
      },
      trigger: { type: "manual" },
      nodes: {},
      edges: [],
    };
    const created = await createWorkflow(newWorkflow);
    if (created) {
      // Refresh list THEN select — so the new item is in the list
      await getWorkflows();
      setSelectedWorkflowId(created.metadata.id || newId);
    }
  }, [createWorkflow, getWorkflows, setSelectedWorkflowId]);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const ok = await confirm({
        title: "Delete Workflow",
        description:
          "Permanently delete this workflow? This action cannot be undone.",
        confirmLabel: "Delete",
        confirmIcon: Trash2,
        variant: "destructive",
      });
      if (ok) {
        await deleteWorkflow(id);
        if (selectedWorkflowId === id) setSelectedWorkflowId(null);
        // Refresh the single list immediately
        await getWorkflows();
      }
    },
    [
      confirm,
      deleteWorkflow,
      selectedWorkflowId,
      setSelectedWorkflowId,
      getWorkflows,
    ],
  );

  const workflow = workflows.find((w) => w.metadata.id === selectedWorkflowId);

  if (workflow) {
    return (
      <WorkflowEditor
        key={workflow.metadata.id}
        workflow={workflow}
        workflows={workflows}
        onClose={() => {
          setSelectedWorkflowId(null);
          getWorkflows(); // refresh list after closing editor
        }}
        onSaved={getWorkflows} // ← refresh list after every save (fixes stale trigger params)
      />
    );
  }

  return (
    <EmptyCanvas
      workflows={workflows}
      loading={loading}
      onCreate={handleCreate}
      creating={creating}
      onDelete={handleDelete}
      onRefresh={getWorkflows}
    />
  );
};
