import type { FC } from "react";
import { Button } from "~/components/ui/button";
import { X, Upload, FileJson } from "lucide-react";
import { useCreateWorkflow } from "../hooks/useCreateWorkflow";
import type { WorkflowItem } from "../types/workflow-types";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export const ImportWorkflowDialog: FC<Props> = ({ onClose, onImported }) => {
  const { createWorkflow } = useCreateWorkflow();

  return (
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
              <p className="text-mini text-muted-foreground uppercase font-black tracking-widest opacity-60">
                Upload your workflow .json file
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
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
                if (data.metadata) {
                  data.metadata.id = `wf_imported_${Date.now()}`;
                  data.metadata.isDraft = true;
                }
                const created = await createWorkflow(data);
                if (created) {
                  onImported();
                  onClose();
                }
              } catch {
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
              <span className="text-mini font-bold text-muted-foreground/40 uppercase tracking-widest">
                Maximum payload: 50MB
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-2xl font-black uppercase text-mini tracking-widest text-muted-foreground hover:bg-sidebar-accent/10"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
