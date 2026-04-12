import { Play, Plus, Save, X, Settings, Loader2, Activity, Download, Cpu } from "lucide-react";
import { Button } from "~/components/ui/button";

interface Props {
  workflowName: string;
  workflowId: string;
  onRun: () => void;
  onAddNode: () => void;
  onSave: () => void;
  onSettings: () => void;
  onLogs: () => void;
  onClose: () => void;
  isSaving: boolean;
  isExecuting: boolean;
  isLogsOpen: boolean;
  isDirty: boolean;
  workflow: any; // Full object for export
}

export const WorkflowEditorDock = ({
  workflowName,
  workflowId,
  onRun,
  onAddNode,
  onSave,
  onSettings,
  onLogs,
  onClose,
  isSaving,
  isExecuting,
  isLogsOpen,
  isDirty,
  workflow,
}: Props) => {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[50]">
      <div className="flex items-center gap-1.5 p-1.5 bg-sidebar/85 border border-sidebar-accent/30 rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-1000 fill-mode-forwards antialiased">
        
        {/* Section 1: Workflow Identity */}
        <div className="flex items-center gap-3 pl-4 pr-3 border-r border-sidebar-accent/20 h-10 group/brand cursor-default">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover/brand:border-violet-500/40 transition-colors">
            <Cpu className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[12px] font-black text-foreground tracking-wide leading-none mb-0.5 max-w-[150px] truncate uppercase">
              Editor
            </h1>
            <div className="flex items-center gap-1.5">
               <div className={`w-1 h-1 rounded-full animate-pulse shadow-[0_0_5px_currentColor] ${isDirty ? 'bg-amber-500 text-amber-500' : 'bg-violet-500 text-violet-500'}`} />
               <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider leading-none opacity-40">
                 {isDirty ? 'Unsaved Changes' : `ID: ${workflowId.slice(0, 8)}...`}
               </span>
            </div>
          </div>
        </div>

        {/* Section 2: Runtime Controls */}
        <div className="flex items-center gap-1 px-2 border-r border-sidebar-accent/20 h-10">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRun}
            disabled={isExecuting}
            className="h-8 rounded-full hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 gap-1.5 px-3 transition-all group/run"
          >
             {isExecuting ? (
               <Loader2 className="w-3.5 h-3.5 animate-spin" />
             ) : (
               <Play className="w-3 h-3 fill-current group-hover:scale-110 transition-transform" />
             )}
             <span className="text-[10px] font-black uppercase tracking-widest">Execute</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onLogs}
            className={`h-8 rounded-full gap-1.5 px-3 transition-all ${isLogsOpen ? 'bg-violet-500/10 text-violet-500' : 'text-muted-foreground hover:bg-sidebar-accent/10 hover:text-violet-500'}`}
          >
             <Activity className={`w-3.5 h-3.5 ${isLogsOpen ? 'animate-pulse' : ''}`} />
             <span className="text-[10px] font-black uppercase tracking-widest">Logs</span>
          </Button>
        </div>

        {/* Section 3: Architect Tools */}
        <div className="flex items-center gap-1 px-2 border-r border-sidebar-accent/20 h-10">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onAddNode}
            className="h-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground gap-1.5 px-3 transition-all"
          >
             <Plus className="w-3.5 h-3.5" />
             <span className="text-[10px] font-black uppercase tracking-widest">Add Node</span>
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${workflowName.replace(/\s+/g, '_').toLowerCase()}_v${workflow.metadata?.version ?? '1.0'}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-blue-500 transition-all group/tool relative"
          >
             <Download className="w-3.5 h-3.5" />
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-[8px] font-black uppercase opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none">Export</div>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSettings}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all"
          >
             <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Section 4: Main Action & Close */}
        <div className="flex items-center gap-2 pl-2 pr-1">
          <Button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className={`h-9 px-5 rounded-full font-black uppercase text-[9px] tracking-[0.15em] gap-2 transition-all duration-300 ${
              isDirty 
              ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_5px_20px_rgba(139,92,246,0.15)]' 
              : 'bg-sidebar-accent/10 text-muted-foreground opacity-50'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? 'Compiling' : 'Save'}
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all group/close"
          >
             <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};
