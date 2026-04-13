import { useEffect, useState } from "react";
import { useGetWorkflows } from "../hooks/useGetWorkflows";
import { useDeleteWorkflow } from "../hooks/useDeleteWorkflow";
import { useExecuteWorkflow } from "../hooks/useExecuteWorkflow";
import { Layers } from "lucide-react";
import { WorkflowDashboardDock } from "./WorkflowDashboardDock";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowModuleCard } from "./WorkflowModuleCard";
import { ImportWorkflowDialog } from "./ImportWorkflowDialog";
import type { WorkflowItem } from "../types/workflow-types";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";
import { useCreateWorkflow } from "../hooks/useCreateWorkflow";
import { LoadingSpinner } from "~/shared/components/LoadingSpinner";

export const WorkflowsList = () => {
  const { workflows, loading, getWorkflows } = useGetWorkflows();
  const { createWorkflow, loading: creating } = useCreateWorkflow();
  const { deleteWorkflow } = useDeleteWorkflow();
  const { executeWorkflow } = useExecuteWorkflow();

  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [executingMap, setExecutingMap] = useState<Record<string, boolean>>({});

  const [runWorkflowId, setRunWorkflowId] = useState<string | null>(null);
  const [logsWorkflowId, setLogsWorkflowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    getWorkflows();
  }, []);

  const handleCreate = async () => {
    const newId = `wf_${Date.now()}`;
    const newWorkflow: WorkflowItem = {
      metadata: {
        id: newId,
        name: "New Workflow",
        description: "My new automated workflow",
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
      await getWorkflows();
      setSelectedWorkflow(created.metadata.id || newId);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this workflow and all its data?")) {
      await deleteWorkflow(id);
      if (selectedWorkflow === id) setSelectedWorkflow(null);
      getWorkflows();
    }
  };

  const handleRun = async (id: string, params: Record<string, any>) => {
    setExecutingMap((prev) => ({ ...prev, [id]: true }));
    setRunWorkflowId(null);
    try {
      await executeWorkflow(id, params);
    } catch (err) {
      console.error("Execution error:", err);
    } finally {
      setExecutingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filteredItems = workflows.filter(
    (w) =>
      w.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.metadata.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/30">
        <LoadingSpinner
          label="Initializing Workspaces..."
        />
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.02)_0%,transparent_60%)]">
      <WorkflowDashboardDock
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onImport={() => setIsImportOpen(true)}
        onCreate={handleCreate}
        moduleCount={workflows.length}
        isCreating={creating}
      />

      <main
        className={`mx-auto px-8 pt-36 pb-10 overflow-y-auto h-full custom-scrollbar transition-all duration-500 ${viewMode === "list" ? "max-w-4xl" : "max-w-6xl"}`}
      >
        <div
          className={`grid gap-6 pb-20 fade-in animate-in slide-in-from-bottom-4 duration-1000 ${viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
        >
          {filteredItems.map((workflow) => (
            <WorkflowModuleCard
              key={workflow.metadata.id}
              workflow={workflow}
              isExecuting={!!executingMap[workflow.metadata.id]}
              onEdit={() => setSelectedWorkflow(workflow.metadata.id)}
              onRun={() => setRunWorkflowId(workflow.metadata.id)}
              onLogs={() => setLogsWorkflowId(workflow.metadata.id)}
              onDelete={(e) => handleDelete(workflow.metadata.id, e)}
            />
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-20 gap-4 border border-dashed border-border/50 rounded-[3rem] bg-accent/5">
              <div className="w-16 h-16 rounded-3xl bg-muted/10 flex items-center justify-center">
                <Layers className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  No modules detected
                </p>
                <p className="text-[10px] text-muted-foreground/20 font-bold uppercase tracking-widest mt-1">
                  Try adjusting your search filters
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Panels Overlays */}
      {runWorkflowId && (
        <RunWorkflowPanel
          workflow={
            workflows.find(
              (w) => w.metadata.id === runWorkflowId,
            ) as WorkflowItem
          }
          onExecute={(params) => handleRun(runWorkflowId, params)}
          onClose={() => setRunWorkflowId(null)}
          loading={!!executingMap[runWorkflowId]}
        />
      )}

      {logsWorkflowId && (
        <WorkflowLogsPanel
          workflowId={logsWorkflowId}
          onClose={() => setLogsWorkflowId(null)}
        />
      )}

      {selectedWorkflow && (
        <WorkflowEditor
          workflow={
            workflows.find(
              (w) => w.metadata.id === selectedWorkflow,
            ) as WorkflowItem
          }
          onClose={() => {
            setSelectedWorkflow(null);
            getWorkflows();
          }}
        />
      )}

      {/* Import Dialog */}
      {isImportOpen && (
        <ImportWorkflowDialog
          onClose={() => setIsImportOpen(false)}
          onImported={() => getWorkflows()}
        />
      )}
    </div>
  );
};
