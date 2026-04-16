import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { NodeStatusInfo } from "../hooks/useWorkflowStream";
import { cn } from "~/lib/utils";

interface Props {
  nodeId: string;
  statusInfo: NodeStatusInfo;
}

export function NodeOutputPanel({ nodeId, statusInfo }: Props) {
  const [copied, setCopied]       = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const { status, output, error, startedAt, completedAt } = statusInfo;

  const duration =
    startedAt && completedAt
      ? ((completedAt - startedAt) / 1000).toFixed(2)
      : null;

  const formattedOutput = (() => {
    if (status === "failed") return null;
    if (output === undefined || output === null) return "null";
    try { return JSON.stringify(output, null, 2); }
    catch { return String(output); }
  })();

  const handleCopy = async () => {
    const text = status === "failed" ? error ?? "" : formattedOutput ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = status === "success";

  return (
    <div
      className={cn(
        "rounded-md border overflow-hidden shrink-0",
        isSuccess ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 cursor-pointer",
          isSuccess
            ? "bg-emerald-500/10 border-b border-emerald-500/20"
            : "bg-red-500/10 border-b border-red-500/20",
        )}
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={cn("text-xs font-medium", isSuccess ? "text-emerald-500" : "text-red-500")}>
            {isSuccess ? "Output" : "Error"}
          </span>
          {duration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {duration}s
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-3 max-h-[300px] min-h-[40px] overflow-y-auto bg-black/30">
          {status === "failed" ? (
            <p className="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
              {error ?? "Unknown error"}
            </p>
          ) : (
            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">
              {formattedOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
