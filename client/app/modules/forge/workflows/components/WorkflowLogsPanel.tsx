import { useEffect, useState } from "react";
import {
  X, Trash2, Calendar, Clock, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Loader2, AlertTriangle,
  Database, ArrowRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { useGetWorkflowExecutions } from "../hooks/useGetWorkflowExecutions";
import { useClearWorkflowExecutions } from "../hooks/useClearWorkflowExecutions";
import { useConfirm } from "~/providers/ConfirmProvider";
import { cn } from "~/lib/utils";

interface Props {
  workflowId: string;
  onClose: () => void;
}

export const WorkflowLogsPanel = ({ workflowId, onClose }: Props) => {
  const { getExecutions, executions, loading } = useGetWorkflowExecutions();
  const { clearExecutions, loading: clearing } = useClearWorkflowExecutions();
  const [selectedExec, setSelectedExec] = useState<any | null>(null);
  const confirm = useConfirm();

  useEffect(() => { getExecutions(workflowId); }, [workflowId, getExecutions]);

  const handleClear = async () => {
    const ok = await confirm({
      title: "Clear Execution Logs",
      description: "Are you sure you want to clear all execution logs for this workflow? This action cannot be undone.",
      confirmLabel: "Clear All",
      confirmIcon: Trash2,
      variant: "destructive",
    });
    if (ok) { await clearExecutions(workflowId); getExecutions(workflowId); }
  };

  const formatTime = (time: number) =>
    new Date(time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusColor = (status: string) =>
    status === "SUCCESS"  ? "text-emerald-400"
    : status === "RUNNING" ? "text-amber-400"
    : "text-red-400";

  const statusBg = (status: string) =>
    status === "SUCCESS"  ? "bg-emerald-500/10 border-emerald-500/20"
    : status === "RUNNING" ? "bg-amber-500/10 border-amber-500/20"
    : "bg-red-500/10 border-red-500/20";

  const renderDetails = () => {
    if (!selectedExec) return null;
    const context = selectedExec.context_state;
    const steps   = context.steps || {};

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sub-header */}
        <div className="h-10 flex items-center gap-2 px-4 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => setSelectedExec(null)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            #{selectedExec.id.split("_").pop()}
          </span>
          <span className="text-xs font-medium">Execution Details</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Status */}
          <div className={cn("flex items-center gap-3 p-3 rounded-md border", statusBg(selectedExec.status))}>
            {selectedExec.status === "SUCCESS" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selectedExec.status === "RUNNING" ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <div className="flex flex-col">
              <span className={cn("text-sm font-semibold", statusColor(selectedExec.status))}>
                {selectedExec.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedExec.status === "SUCCESS"
                  ? "Completed successfully"
                  : selectedExec.status === "RUNNING"
                    ? "Currently running"
                    : "Failed with error"}
              </span>
            </div>
          </div>

          {/* Trigger payload */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Database className="w-3 h-3" /> Trigger Payload
            </p>
            <pre className="bg-accent border border-border rounded-md p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(context.trigger, null, 2)}
            </pre>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3" /> Steps
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(steps)
                .filter(([key]) => key !== "error")
                .map(([key, val]: [string, any]) => (
                  <div key={key} className="rounded-md border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            val.status === "SUCCESS" ? "bg-emerald-400" : "bg-red-400",
                          )}
                        />
                        <span className="text-xs font-mono font-medium">{key}</span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded",
                          val.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400",
                        )}
                      >
                        {val.status}
                      </span>
                    </div>
                    {val.error && (
                      <div className="px-3 py-2 bg-red-500/5 flex items-start gap-2 border-t border-red-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-400 leading-relaxed">{val.error}</p>
                      </div>
                    )}
                  </div>
                ))}

              {steps.error && (
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-md flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-red-400">Global Error</span>
                    <p className="text-xs text-red-400/80 leading-relaxed">{steps.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[440px] h-[580px] bg-card border border-border border-t-0! flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Execution Logs</span>
          <span className="text-xs text-muted-foreground">{workflowId}</span>
        </div>
        <div className="flex items-center gap-1">
          {!selectedExec && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={clearing || executions.length === 0}
              className="h-7 px-2.5 text-xs rounded-md text-destructive hover:bg-destructive/10 gap-1.5"
            >
              {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Clear
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedExec ? (
          renderDetails()
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-20 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
                <Clock className="w-6 h-6 opacity-30" />
                <p className="text-xs">No executions yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {executions.map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedExec(exec)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md border", statusBg(exec.status))}>
                        {exec.status === "SUCCESS" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : exec.status === "RUNNING" ? (
                          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{exec.status}</span>
                          <span className="text-xs text-muted-foreground font-mono opacity-50">
                            #{exec.id.split("_").pop()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTime(exec.start_time)}
                          </span>
                          {exec.end_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.max(1, Math.round((exec.end_time - exec.start_time) / 1000))}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!selectedExec && executions.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {executions.length} execution{executions.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
      )}
    </div>
  );
};
