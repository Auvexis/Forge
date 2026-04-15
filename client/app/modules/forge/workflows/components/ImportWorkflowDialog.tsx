import type { FC } from "react";
import { Button } from "~/components/ui/button";
import { X, Upload, FileJson } from "lucide-react";
import { toast } from "~/shared/helpers/toast";
import { useCreateWorkflow } from "../hooks/useCreateWorkflow";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export const ImportWorkflowDialog: FC<Props> = ({ onClose, onImported }) => {
  const { createWorkflow } = useCreateWorkflow();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-sm p-6 shadow-xl">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-foreground leading-none mb-1.5">
                Import Workflow
              </h2>
              <p className="text-sm text-muted-foreground leading-none">
                Upload a workflow .json file
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-md h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 -mt-1 -mr-1"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Dropzone */}
        <div className="relative group mb-6">
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
              } catch (err: any) {
                // To avoid duplicate toasts if it came from handleApi
                if (err.message && !err.message.includes("status") && !err.message.includes("Invalid")) {
                   toast.error("Import Failed", { description: err.message });
                } else if (!err.message) {
                   toast.error("Import Failed", { description: "Invalid workflow file structure." });
                }
              }
            }}
          />
          <div className="h-40 rounded-lg border-2 border-dashed border-border bg-accent/30 flex flex-col items-center justify-center gap-3 group-hover:bg-accent group-hover:border-primary/40">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm border border-border">
              <FileJson className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-medium text-foreground">
                Click or drag file here
              </span>
              <span className="text-xs text-muted-foreground">
                Maximum payload: 50MB
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            className="h-9 px-4 rounded-md text-sm font-medium"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

      </div>
    </div>
  );
};
