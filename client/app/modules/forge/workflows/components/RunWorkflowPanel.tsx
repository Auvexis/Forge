import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { X, Play, Loader2, Zap } from "lucide-react";
import type { WorkflowItem } from "../types/workflow-types";

interface Props {
  workflow: WorkflowItem;
  onExecute: (params: Record<string, any>) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export const RunWorkflowPanel = ({ workflow, onExecute, onClose, loading }: Props) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const schema = workflow.trigger.schema || {};
  const hasParams = Object.keys(schema).length > 0;

  const handleRun = () => {
    onExecute(params);
  };

  return (
    <div className="absolute top-20 right-4 w-[400px] z-[70] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 max-h-[calc(100%-110px)]">
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary/10 shrink-0">
        <div className="flex flex-col">
          <h3 className="font-black text-[9px] uppercase tracking-widest text-primary">Run Configuration</h3>
          <span className="text-sm font-bold truncate max-w-[280px]">Execution Parameters</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
           <div className="flex items-center gap-2 text-primary">
              <Zap className="w-4 h-4 fill-current" />
              <span className="text-[11px] font-black uppercase tracking-widest">Trigger Info</span>
           </div>
           <p className="text-xs text-muted-foreground leading-relaxed mt-1">
             This workflow starts with a <strong>{workflow.trigger.type}</strong> trigger. 
             {hasParams ? " Below are the required inputs to start execution manually." : " No manual inputs required."}
           </p>
        </div>

        {hasParams && (
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <h3 className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">
                  Required Inputs
                </h3>
             </div>

             <div className="flex flex-col gap-4">
               {Object.entries(schema).map(([key, field]: [string, any]) => {
                 const isFile = field.type === "file";
                 return (
                   <div key={key} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                           {key} {field.required && <span className="text-destructive">*</span>}
                         </label>
                         <span className="text-[9px] bg-accent/30 px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black">
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
                          className="bg-accent/10 border-border/50 h-10 pt-1.5 font-semibold text-sm cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 file:text-[10px] file:font-bold file:uppercase file:mr-4 file:hover:bg-primary/80 transition-all"
                        />
                      ) : (
                        <Input 
                          placeholder={`Enter value for ${key}...`}
                          value={params[key] || ""}
                          onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                          className="bg-accent/10 border-border/50 h-10 font-bold text-sm"
                        />
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-accent/10 flex flex-col gap-2 shrink-0">
        <Button 
          variant="default" 
          size="lg" 
          onClick={handleRun}
          disabled={loading}
          className="w-full rounded-2xl h-12 font-semibold text-xs uppercase tracking-[0.08em] shadow-lg shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Play className="w-4 h-4 mr-2 fill-current" />
          )}
          {loading ? "Executing..." : "Start Workflow"}
        </Button>
      </div>
    </div>
  );
};
