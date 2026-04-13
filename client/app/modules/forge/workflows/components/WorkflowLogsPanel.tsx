import { useEffect, useState } from "react";
import { 
  X, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Info,
  Database,
  ArrowRight
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useGetWorkflowExecutions } from "../hooks/useGetWorkflowExecutions";
import { useClearWorkflowExecutions } from "../hooks/useClearWorkflowExecutions";
import { useConfirm } from "~/providers/ConfirmProvider";

interface Props {
  workflowId: string;
  onClose: () => void;
}

export const WorkflowLogsPanel = ({ workflowId, onClose }: Props) => {
  const { getExecutions, executions, loading } = useGetWorkflowExecutions();
  const { clearExecutions, loading: clearing } = useClearWorkflowExecutions();
  const [selectedExec, setSelectedExec] = useState<any | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    getExecutions(workflowId);
  }, [workflowId, getExecutions]);

  const handleClear = async () => {
    const ok = await confirm({
      title: "Clear Execution Logs",
      description: "Are you sure you want to clear all execution logs for this workflow? This action cannot be undone.",
      confirmLabel: "Clear All",
      confirmIcon: Trash2,
      variant: "destructive",
    });
    if (ok) {
      await clearExecutions(workflowId);
      getExecutions(workflowId);
    }
  };

  const renderDetails = () => {
    if (!selectedExec) return null;
    const context = selectedExec.context_state;
    const steps = context.steps || {};

    return (
      <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-300">
        <div className="flex items-center gap-3 p-4 border-b border-border bg-accent/10">
           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedExec(null)}>
              <ChevronLeft className="w-4 h-4" />
           </Button>
           <div className="flex flex-col">
              <span className="text-mini font-mono text-muted-foreground">EX-ID: {selectedExec.id}</span>
              <span className="text-xs font-bold leading-none mt-0.5">Execution Details</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
          {/* Status Overview */}
          <div className={`p-4 rounded-xl border flex items-center gap-4 ${
            selectedExec.status === "SUCCESS" 
            ? "bg-emerald-500/5 border-emerald-500/20" 
            : selectedExec.status === "RUNNING"
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-destructive/5 border-destructive/20"
          }`}>
             <div className={`p-2 rounded-lg ${
                selectedExec.status === "SUCCESS" 
                ? "bg-emerald-500/20 text-emerald-500" 
                : selectedExec.status === "RUNNING"
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-destructive/20 text-destructive"
             }`}>
                {selectedExec.status === "SUCCESS" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : selectedExec.status === "RUNNING" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
             </div>
             <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider">{selectedExec.status}</span>
                <span className="text-mini text-muted-foreground font-medium">
                  {selectedExec.status === "SUCCESS" 
                    ? "Workflow finished successfully" 
                    : selectedExec.status === "RUNNING"
                      ? "System core is processing this flow"
                      : "Execution halted due to an error"}
                </span>
             </div>
          </div>

          {/* Trigger Data */}
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-micro font-black ml-1">
                <Database className="w-3 h-3" />
                Trigger Payload
             </div>
             <div className="bg-background/50 border border-border/50 rounded-xl p-3 font-mono text-mini whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(context.trigger, null, 2)}
             </div>
          </div>

          {/* Steps Trace */}
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-micro font-black ml-1">
                <ArrowRight className="w-3 h-3" />
                Steps Execution Trace
             </div>
             <div className="flex flex-col gap-2">
                {Object.entries(steps).filter(([key]) => key !== 'error').map(([key, val]: [string, any]) => (
                  <div key={key} className="flex flex-col bg-background/30 border border-border/50 rounded-xl overflow-hidden">
                     <div className="flex items-center justify-between p-3 border-b border-border/10">
                        <div className="flex items-center gap-2.5">
                           <div className={`w-2 h-2 rounded-full ${val.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                           <span className="text-tiny font-bold font-mono">{key}</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                           val.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                        }`}>
                           {val.status}
                        </span>
                     </div>
                     {val.error && (
                        <div className="p-3 bg-destructive/5 flex items-start gap-2.5 border-t border-destructive/10">
                           <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                           <p className="text-mini text-destructive leading-relaxed font-semibold">
                              {val.error}
                           </p>
                        </div>
                     )}
                  </div>
                ))}

                {/* Main Error */}
                {steps.error && (
                   <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 mt-2">
                      <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1">
                         <span className="text-mini font-black uppercase text-destructive tracking-widest">Global Error</span>
                         <p className="text-xs text-destructive font-medium leading-relaxed">
                            {steps.error}
                         </p>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const formatTime = (time: number) => {
    return new Date(time).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[450px] z-[60] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 origin-top h-[600px]">
      <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20 shrink-0">
        <div className="flex flex-col">
          <h3 className="font-black text-micro uppercase tracking-widest text-foreground/50">History & Monitoring</h3>
          <span className="text-sm font-bold">Execution Logs</span>
        </div>
        {!selectedExec && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClear}
              disabled={clearing || executions.length === 0}
              className="h-7 text-mini font-black uppercase text-destructive hover:bg-destructive/10 rounded-lg gap-1.5"
            >
              {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Clear All
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        {selectedExec && (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedExec ? (
          renderDetails()
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs font-medium uppercase tracking-widest animate-pulse">Fetching records...</span>
              </div>
            ) : executions.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-1">
                   <Clock className="w-6 h-6" />
                </div>
                <span className="text-tiny font-black uppercase tracking-wider">No executions yet</span>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {executions.map((exec) => (
                  <div 
                    key={exec.id}
                    className="group p-4 hover:bg-foreground/5 transition-all flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedExec(exec)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl border ${
                        exec.status === "SUCCESS" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                        : exec.status === "RUNNING"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          : "bg-destructive/10 border-destructive/20 text-destructive"
                      }`}>
                        {exec.status === "SUCCESS" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : exec.status === "RUNNING" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold leading-none">{exec.status}</span>
                            <span className="text-mini text-muted-foreground font-mono opacity-50">#{exec.id.split('_').pop()}</span>
                         </div>
                         <div className="flex items-center gap-3 mt-1.5 grayscale group-hover:grayscale-0 transition-all">
                            <div className="flex items-center gap-1 text-mini text-muted-foreground font-medium">
                              <Calendar className="w-3 h-3" />
                              {formatTime(exec.start_time)}
                            </div>
                            {exec.end_time && (
                              <div className="flex items-center gap-1 text-mini text-muted-foreground font-medium">
                                 <Clock className="w-3 h-3" />
                                 {Math.max(1, Math.round((exec.end_time - exec.start_time) / 1000))}s
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedExec && (
        <div className="p-4 bg-accent/10 border-t border-border flex justify-center shrink-0">
           <p className="text-micro font-black uppercase tracking-[0.1em] text-muted-foreground/60">
             Last {executions.length} executions tracked natively
           </p>
        </div>
      )}
    </div>
  );
};
