import { useEffect, useState, cloneElement } from "react";
import { useGetWorkflows } from "../hooks/useGetWorkflows";
import { useCreateWorkflow } from "../hooks/useCreateWorkflow";
import { useDeleteWorkflow } from "../hooks/useDeleteWorkflow";
import { useExecuteWorkflow } from "../hooks/useExecuteWorkflow";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Workflow,
  Play,
  Trash2,
  Edit2,
  Loader2,
  Calendar,
  Layers,
  Activity,
  Download,
  Upload,
  FileJson,
  X,
} from "lucide-react";
import { WorkflowDashboardDock } from "./WorkflowDashboardDock";
import { WorkflowEditor } from "./WorkflowEditor";
import { Input } from "~/components/ui/input";
import type { WorkflowItem } from "../types/workflow-types";
import { RunWorkflowPanel } from "./RunWorkflowPanel";
import { WorkflowLogsPanel } from "./WorkflowLogsPanel";

interface ModuleCardProps {
  workflow: WorkflowItem;
  isExecuting: boolean;
  onEdit: () => void;
  onRun: () => void;
  onLogs: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const WorkflowModuleCard = ({ workflow, isExecuting, onEdit, onRun, onLogs, onDelete }: ModuleCardProps) => {
  return (
    <div
      onClick={onEdit}
      className="group relative flex flex-col bg-card/60 border border-border/90 rounded-[2rem] p-6 cursor-pointer hover:bg-card/80 transition-all duration-300 hover:border-primary/40"
    >
      {/* Header metadata */}
      <div className="flex items-center justify-between mb-6">
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${workflow.metadata.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-muted/10 border-border/50 text-muted-foreground'}`}>
           <div className={`w-1.5 h-1.5 rounded-full ${workflow.metadata.isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-muted-foreground/50'}`} />
           <span className="text-[9px] font-black uppercase tracking-widest leading-none">
             {workflow.metadata.isActive ? "Live" : "Draft"}
           </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
           #{workflow.metadata.id.slice(-6)}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-8">
        <div className={`w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center shrink-0 border border-border/80 transition-colors ${isExecuting ? 'animate-pulse border-amber-500/50' : ''}`}>
          <Activity className={`w-5 h-5 transition-colors ${
            isExecuting ? 'text-amber-500' : 'text-primary'
          }`} />
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-[15px] font-black text-foreground truncate mb-1">
            {workflow.metadata.name}
          </h3>
          <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 leading-relaxed opacity-70">
            {workflow.metadata.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/20">
        <div className="flex items-center gap-3">
           <Button
             variant="ghost"
             size="sm"
             onClick={(e) => { e.stopPropagation(); onLogs(); }}
             className="h-8 px-3 rounded-xl bg-accent/30 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
           >
             <Calendar className="w-3 h-3" />
             Logs
           </Button>
           <Button
             variant="ghost"
             size="sm"
             disabled={isExecuting}
             onClick={(e) => { e.stopPropagation(); onRun(); }}
             className={`h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 transition-all ${
               isExecuting ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary hover:bg-primary/20'
             }`}
           >
             {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
             {isExecuting ? 'Running' : 'Run'}
           </Button>
        </div>

        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-accent text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass rounded-2xl border-border/50 min-w-[180px] p-1.5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer"
                onClick={() => onEdit()}
              >
                <Edit2 className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold">Configure Logic</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${workflow.metadata.name.replace(/\s+/g, '_').toLowerCase()}_v${workflow.metadata.version}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold">Export Module</span>
              </DropdownMenuItem>
              <div className="h-px bg-border/40 my-1 mx-2" />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:bg-destructive/10 gap-3 py-2.5 px-3 rounded-xl cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[11px] font-bold">Purge Module</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

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
      trigger: {
        type: "manual",
      },
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
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-muted-foreground bg-background/30">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
          Initializing Workspaces...
        </span>
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

      <main className={`mx-auto px-8 pt-36 pb-10 overflow-y-auto h-full custom-scrollbar transition-all duration-500 ${viewMode === 'list' ? 'max-w-4xl' : 'max-w-6xl'}`}>
        <div className={`grid gap-6 pb-20 transition-all duration-500 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
          workflow={workflows.find(w => w.metadata.id === runWorkflowId) as WorkflowItem}
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

      {/* Import Dialog Overlay */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-sidebar/90 backdrop-blur-3xl border border-sidebar-accent/30 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                       <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                       <h2 className="text-xl font-black text-foreground tracking-tight leading-none mb-1">
                          Import Module
                       </h2>
                       <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                          Upload your workflow .json file
                       </p>
                    </div>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="rounded-full h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
                   onClick={() => setIsImportOpen(false)}
                 >
                    <X className="w-5 h-5" />
                 </Button>
              </div>

              <div className="relative group mb-8">
                 <input 
                   type="file" 
                   accept=".json"
                   className="absolute inset-0 opacity-0 cursor-pointer z-10"
                   onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        // Clean ID to avoid duplicate keys if same workflow
                        if (data.metadata) {
                          data.metadata.id = `wf_imported_${Date.now()}`;
                          data.metadata.isDraft = true;
                        }
                        const created = await createWorkflow(data);
                        if (created) {
                          await getWorkflows();
                          setIsImportOpen(false);
                        }
                      } catch (err) {
                        alert("Invalid workflow file structure.");
                      }
                   }}
                 />
                 <div className="h-48 rounded-[2rem] border-2 border-dashed border-sidebar-accent/30 bg-sidebar-accent/5 flex flex-col items-center justify-center gap-4 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                    <div className="w-14 h-14 rounded-full bg-sidebar-accent/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                       <FileJson className="w-7 h-7 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <span className="text-xs font-black uppercase tracking-widest text-foreground/70">
                          Drag & Drop or Click
                       </span>
                       <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                          Maximum payload: 50MB
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <Button 
                   variant="ghost" 
                   className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:bg-sidebar-accent/10"
                   onClick={() => setIsImportOpen(false)}
                 >
                    Cancel
                 </Button>
                 <Button 
                   className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium"
                   onClick={() => {
                      // Trigger input click would be nice but since it's hidden we just rely on the input above
                   }}
                 >
                    Search Local Storage
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
