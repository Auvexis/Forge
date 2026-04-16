import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { X, Play, Loader2 } from "lucide-react";
import type { WorkflowItem } from "../types/workflow-types";

interface Props {
  workflow: WorkflowItem;
  onExecute: (params: Record<string, any>) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export const RunWorkflowPanel = ({ workflow, onExecute, onClose, loading }: Props) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const schema    = workflow.trigger.schema || {};
  const hasParams = Object.keys(schema).length > 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 w-[360px] h-full z-[70] bg-card border-l border-border flex flex-col overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Run Workflow</span>
          <span className="text-xs text-muted-foreground">{workflow.trigger.type} trigger</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Trigger info */}
        <div className="p-3 rounded-md bg-accent border border-border text-sm text-muted-foreground">
          {hasParams
            ? "Fill in the required inputs below to start execution."
            : "No inputs required for this workflow. Click Run to execute."}
        </div>

        {/* Fields */}
        {hasParams && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Required Inputs
            </p>
            {Object.entries(schema).map(([key, field]: [string, any]) => {
              const isFile = field.type === "file";
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      {key}
                      {field.required && <span className="text-destructive ml-0.5">*</span>}
                    </label>
                    <span className="text-xs bg-accent px-1.5 py-0.5 rounded text-muted-foreground">
                      {field.type}
                    </span>
                  </div>
                  {isFile ? (
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setParams({ ...params, [key]: file });
                      }}
                      className="h-9 text-sm cursor-pointer"
                    />
                  ) : (
                    <Input
                      placeholder={`Enter ${key}...`}
                      value={params[key] || ""}
                      onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={() => onExecute(params)}
          disabled={loading}
          className="w-full h-9 text-sm font-medium rounded-md gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          {loading ? "Executing..." : "Run Workflow"}
        </Button>
      </div>
    </div>
  );
};
