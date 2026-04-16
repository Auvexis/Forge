import { X, Save, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import type { WorkflowItem } from "../types/workflow-types";

interface Props {
  workflow: WorkflowItem;
  onUpdate: (data: Partial<WorkflowItem["metadata"]>) => void;
  onClose: () => void;
}

export const WorkflowSettingsPanel = ({ workflow, onUpdate, onClose }: Props) => {
  const [formData, setFormData] = useState({
    id:          workflow.metadata.id,
    name:        workflow.metadata.name,
    description: workflow.metadata.description || "",
  });

  const formatId = (val: string) =>
    val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");

  const handleSave = () => {
    onUpdate({ id: formatId(formData.id), name: formData.name, description: formData.description });
    onClose();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 w-[360px] h-full z-[60] bg-card border-l border-border flex flex-col overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <span className="text-sm font-semibold">Workflow Settings</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* ID field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Unique Identifier
          </label>
          <Input
            value={formData.id}
            onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
            onBlur={() => setFormData((prev) => ({ ...prev, id: formatId(prev.id) }))}
            className="font-mono text-sm h-9"
            placeholder="workflow_id"
          />
          <p className="text-xs text-muted-foreground">
            Lowercase, no spaces. Used in API references.
          </p>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Workflow Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="text-sm h-9"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="What does this workflow do?"
          />
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/5 border border-blue-500/15">
          <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-400/80 leading-relaxed">
            Changing the ID creates a new workflow record. Existing execution logs remain tied to the old ID.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex justify-end gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-3 text-xs rounded-md">
          Cancel
        </Button>
        <Button variant="emphasis" size="sm" onClick={handleSave} className="h-7 px-4 text-xs rounded-md gap-1.5">
          <Save className="w-3.5 h-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
};
