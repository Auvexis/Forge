import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { LoadingSpinner } from "~/shared/components/LoadingSpinner";
import { Plus, Layers, Activity, Trash2 } from "lucide-react";
import { useGetWorkflows } from "../../modules/forge/workflows/hooks/useGetWorkflows";
import { useCreateWorkflow } from "../../modules/forge/workflows/hooks/useCreateWorkflow";
import { useDeleteWorkflow } from "../../modules/forge/workflows/hooks/useDeleteWorkflow";
import type { WorkflowItem } from "../../modules/forge/workflows/types/workflow-types";
import { useConfirm } from "~/providers/ConfirmProvider";

interface ForgeSubSidebarProps {
  id: string;
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  addButton?: React.ReactNode;
  footerInfo?: React.ReactNode;
  children: React.ReactNode;
}

export const ForgeSubSidebarTemplate = ({
  id,
  title,
  subtitle,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  addButton,
  footerInfo,
  children
}: ForgeSubSidebarProps) => {
  const { activeSubSidebar, setActiveSubSidebar } = useForge();
  const [shouldRender, setShouldRender] = useState(false);

  const isVisible = activeSubSidebar === id;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    }
  }, [isVisible]);

  const handleAnimationEnd = () => {
    if (!isVisible) {
      setShouldRender(false);
    }
  };

  if (!shouldRender && !isVisible) return null;

  return (
    <>
      {/* Hover Bridge: Covers the gap between dock and sidebar so mouse doesn't leave */}
      {isVisible && (
        <div 
          className="fixed left-0 top-0 w-32 h-full z-[60] pointer-events-auto"
          onMouseEnter={() => setActiveSubSidebar(id)}
          onMouseLeave={() => setActiveSubSidebar(null)}
        />
      )}

      <div 
        className={cn(
          "fixed left-24 top-1/2 -translate-y-1/2 z-[45] w-[280px] h-[85vh] flex flex-col bg-sidebar/40 backdrop-blur-3xl border border-sidebar-accent/30 rounded-[2.5rem] shadow-[40px_0_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden isolate",
          isVisible 
            ? "animate-in slide-in-from-left-8 fade-in duration-500" 
            : "animate-out slide-out-to-left-8 fade-out duration-500 fill-mode-forwards"
        )}
        onAnimationEnd={handleAnimationEnd}
        onMouseEnter={() => setActiveSubSidebar(id)}
        onMouseLeave={() => setActiveSubSidebar(null)}
      >
        {/* Search Header */}
        <div className="p-5 pb-3 border-b border-sidebar-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 leading-none">
                {subtitle}
              </h2>
              <span className="text-sm font-black text-foreground">{title}</span>
            </div>
            {addButton}
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-muted-foreground/30 transition-colors group-focus-within:text-foreground/50" />
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-foreground/[0.03] border border-foreground/[0.05] focus:border-foreground/10 focus:bg-foreground/[0.05] rounded-xl pl-9 pr-4 py-2 text-[11px] font-bold text-foreground placeholder:text-muted-foreground/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5">
          {children}
        </div>

        {/* Footer Info */}
        {footerInfo && (
          <div className="p-4 bg-foreground/[0.02] border-t border-sidebar-accent/10">
            {footerInfo}
          </div>
        )}
      </div>
    </>
  );
};

export const WorkflowsSubSidebar = () => {
  const { 
    view, 
    selectedWorkflowId, 
    setSelectedWorkflowId, 
    setActiveSubSidebar,
    setView 
  } = useForge();
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
        description: "My new automated workflow",
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
      description: "Are you sure? This is permanent.",
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

  const filtered = workflows.filter(w => 
    w.metadata.name.toLowerCase().includes(search.toLowerCase()) || 
    w.metadata.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ForgeSubSidebarTemplate
      id="workflows"
      title="Workflows"
      subtitle="Orchestrator"
      searchPlaceholder="Search manifests..."
      searchValue={search}
      onSearchChange={setSearch}
      addButton={
        <Button 
          size="icon-sm" 
          variant="ghost" 
          onClick={handleCreate}
          disabled={creating}
          className={cn(
            "rounded-xl bg-foreground/5 text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-all active:scale-90 border border-foreground/5",
            creating && "animate-pulse opacity-50"
          )}
        >
          <Plus className="w-4 h-4" />
        </Button>
      }
      footerInfo={
        <div className="flex items-center justify-between text-nano font-black uppercase tracking-widest opacity-30">
          <span>{filtered.length} Local Units</span>
          <Activity className="w-3 h-3" />
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-30 scale-50">
          <LoadingSpinner label="" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Retrieving...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center opacity-30">
          <Layers className="w-8 h-8" />
          <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">No active deployments detected.</p>
        </div>
      ) : (
        filtered.map((wf) => (
          <button
            key={wf.metadata.id}
            onClick={() => handleSelectWorkflow(wf.metadata.id)}
            className={cn(
              "group relative w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 antialiased overflow-hidden",
              selectedWorkflowId === wf.metadata.id 
                ? "bg-foreground/10 text-foreground border border-foreground/10 shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                : "text-muted-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground/80 hover:scale-[1.02]"
            )}
          >
            {/* Status indicator pill */}
            <div className={cn(
              "w-1 h-8 rounded-full transition-all duration-500",
              selectedWorkflowId === wf.metadata.id ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-foreground/5 group-hover:bg-foreground/10"
            )} />

            <div className="flex flex-col items-start flex-1 min-w-0">
              <div className="flex items-center gap-2 w-full">
                <span className={cn(
                  "text-xs font-bold truncate transition-colors",
                  selectedWorkflowId === wf.metadata.id ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/90"
                )}>
                  {wf.metadata.name}
                </span>
                {wf.metadata.isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                 <span className="text-nano font-black uppercase tracking-tighter opacity-30 font-mono">
                  {wf.metadata.version}
                </span>
                <div className="w-1 h-1 rounded-full bg-foreground/10" />
                <span className="text-nano font-black uppercase tracking-widest opacity-20 truncate max-w-[120px]">
                  {wf.metadata.id}
                </span>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="relative h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                  onClick={(e) => handleDelete(wf.metadata.id, e)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
          </button>
        ))
      )}
    </ForgeSubSidebarTemplate>
  );
};
