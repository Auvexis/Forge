import {
  Play,
  Plus,
  Save,
  X,
  Settings,
  Loader2,
  Activity,
  Download,
  Cpu,
  Square,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ForgeDock, type DockSection } from "~/shared/components/ForgeDock";

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
  workflow: any; // Full object for export
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
}: Props) => {
  const isBusy = isExecuting || isStreaming;

  // Dynamic status dot
  const statusDot = isStreaming
    ? { color: "bg-emerald-400", animate: true }
    : isDirty
      ? { color: "bg-amber-500", animate: true }
      : { color: "bg-violet-500", animate: false };

  const statusText = isStreaming
    ? "Running..."
    : isDirty
      ? "Unsaved Changes"
      : `ID: ${workflowId.slice(0, 8)}...`;

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
              className="h-8 rounded-full hover:bg-red-500/10 text-red-400 hover:text-red-500 gap-1.5 px-3 transition-all group/stop animate-in fade-in duration-300"
            >
              <Square className="w-3 h-3 fill-current group-hover/stop:scale-110 transition-transform" />
              <span className="text-mini font-black uppercase tracking-widest">
                Stop
              </span>
            </Button>
          ) : (
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
                <Play className="w-3 h-3 fill-current group-hover/run:scale-110 transition-transform" />
              )}
              <span className="text-mini font-black uppercase tracking-widest">
                Execute
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogs}
            className={`h-8 rounded-full gap-1.5 px-3 transition-all ${isLogsOpen ? "bg-violet-500/10 text-violet-500" : "text-muted-foreground hover:bg-sidebar-accent/10 hover:text-violet-500"}`}
          >
            <Activity
              className={`w-3.5 h-3.5 ${isLogsOpen ? "animate-pulse" : ""}`}
            />
            <span className="text-mini font-black uppercase tracking-widest">
              Logs
            </span>
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
            className="h-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground gap-1.5 px-3 transition-all disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-mini font-black uppercase tracking-widest">
              Add Node
            </span>
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button
            variant="ghost"
            size="icon"
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
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-blue-500 transition-all group/tool relative"
          >
            <Download className="w-3.5 h-3.5" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-nano font-black uppercase opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none">
              Export
            </div>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all"
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
        className={`px-3 rounded-full font-black uppercase text-tiny! tracking-[0.15em] gap-2 transition-all duration-300 ${
          isDirty && !isBusy
            ? "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_5px_20px_rgba(139,92,246,0.15)]"
            : "bg-sidebar-accent/10 text-muted-foreground opacity-50"
        }`}
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        {isSaving ? "Compiling" : "Save"}
      </Button>
      <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all group/close"
      >
        <X className="w-4 h-4 group-hover/close:scale-110 transition-transform" />
      </Button>
    </>
  );

  return (
    <ForgeDock
      icon={Cpu}
      title="Editor"
      subtitle={statusText}
      accent="violet"
      statusDot={statusDot}
      sections={sections}
      trailing={trailing}
    />
  );
};
