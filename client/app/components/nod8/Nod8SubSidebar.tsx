import { useState, useEffect } from "react";
import { Search, Plus, Layers, Activity, Trash2 } from "lucide-react";
import { useNod8, GlobalViews } from "~/providers/Nod8Provider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useGetWorkflows } from "../../modules/nod8/workflows/hooks/useGetWorkflows";
import { useCreateWorkflow } from "../../modules/nod8/workflows/hooks/useCreateWorkflow";
import { useDeleteWorkflow } from "../../modules/nod8/workflows/hooks/useDeleteWorkflow";
import type { WorkflowItem } from "../../modules/nod8/workflows/types/workflow-types";
import { useConfirm } from "~/providers/ConfirmProvider";

// ── Generic Sub-Sidebar Template ──

interface Nod8SubSidebarProps {
  id: string;
  title: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  addButton?: React.ReactNode;
  footerInfo?: React.ReactNode;
  children: React.ReactNode;
}

export const Nod8SubSidebarTemplate = ({
  id,
  title,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  addButton,
  footerInfo,
  children,
}: Nod8SubSidebarProps) => {
  const { activeSubSidebar } = useNod8();
  const isVisible = activeSubSidebar === id;

  if (!isVisible) return null;

  return (
    <div className="flex-none w-[240px] h-full flex flex-col bg-nod8-subsidebar-bg border-r border-nod8-subsidebar-border">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-nod8-subsidebar-header-border shrink-0">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {addButton}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-nod8-subsidebar-search-row-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-nod8-subsidebar-search-bg border border-nod8-subsidebar-search-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">{children}</div>

      {/* Footer */}
      {footerInfo && (
        <div className="px-3 py-2 border-t border-nod8-subsidebar-footer-border shrink-0">
          {footerInfo}
        </div>
      )}
    </div>
  );
};

// ── Workflows Sub-Sidebar ──

export const WorkflowsSubSidebar = () => {
  const {
    view,
    selectedWorkflowId,
    setSelectedWorkflowId,
    setActiveSubSidebar,
    setView,
  } = useNod8();
  const { workflows, loading, getWorkflows } = useGetWorkflows();
  const { createWorkflow, loading: creating } = useCreateWorkflow();
  const { deleteWorkflow } = useDeleteWorkflow();
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    if (view === GlobalViews.WORKFLOWS) {
      getWorkflows();
    }
  }, [view]);

  const handleCreate = async () => {
    const newId = `wf_${Date.now()}`;
    const newWorkflow: WorkflowItem = {
      metadata: {
        id: newId,
        name: "New Workflow",
        description: "",
        version: "1.0.0",
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
      await getWorkflows();
      setSelectedWorkflowId(created.metadata.id);
      setView(GlobalViews.WORKFLOWS);
      setActiveSubSidebar(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete Workflow",
      description: "Are you sure? This action cannot be undone.",
      confirmLabel: "Delete",
      confirmIcon: Trash2,
      variant: "destructive",
    });
    if (ok) {
      await deleteWorkflow(id);
      if (selectedWorkflowId === id) setSelectedWorkflowId(null);
      getWorkflows();
    }
  };

  const handleSelectWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    setView(GlobalViews.WORKFLOWS);
    setActiveSubSidebar(null);
  };

  const filtered = workflows.filter(
    (w) =>
      w.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
      w.metadata.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Nod8SubSidebarTemplate
      id="workflows"
      title="Workflows"
      searchPlaceholder="Filter workflows..."
      searchValue={search}
      onSearchChange={setSearch}
      addButton={
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCreate}
          disabled={creating}
          title="New workflow"
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      }
      footerInfo={
        <p className="text-xs text-muted-foreground">
          {filtered.length} workflow{filtered.length !== 1 ? "s" : ""}
        </p>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-20 text-muted-foreground">
          <span className="text-xs">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-20 gap-2 text-muted-foreground px-4 text-center">
          <Layers className="w-5 h-5 opacity-40" />
          <p className="text-xs opacity-60">
            {search
              ? "No workflows match your search."
              : "No workflows yet. Create one to get started."}
          </p>
        </div>
      ) : (
        filtered.map((wf) => (
          <div
            key={wf.metadata.id}
            onClick={() => handleSelectWorkflow(wf.metadata.id)}
            className={cn(
              "group relative flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
              selectedWorkflowId === wf.metadata.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {/* Active indicator */}
            {selectedWorkflowId === wf.metadata.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
            )}

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm truncate font-medium">
                  {wf.metadata.name}
                </span>
                {wf.metadata.isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono truncate">
                {wf.metadata.id}
              </span>
            </div>

            {/* Delete on hover */}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => handleDelete(wf.metadata.id, e)}
              title="Delete workflow"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))
      )}
    </Nod8SubSidebarTemplate>
  );
};
