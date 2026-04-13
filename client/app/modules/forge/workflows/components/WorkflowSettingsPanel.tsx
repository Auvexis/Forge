import { X, Save, AlertCircle } from "lucide-react";
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
    id: workflow.metadata.id,
    name: workflow.metadata.name,
    description: workflow.metadata.description || "",
  });

  const formatId = (val: string) => {
    return val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
  };

  const handleSave = () => {
    onUpdate({ 
      id: formatId(formData.id), 
      name: formData.name, 
      description: formData.description 
    });
    onClose();
  };

  return (
    <div className="absolute top-20 right-4 w-[350px] z-[60] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20">
        <h3 className="font-black text-xs uppercase tracking-widest text-foreground/70">Workflow Settings</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">Unique Identifier (ID)</label>
          <div className="relative group/id">
            <Input 
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              onBlur={() => setFormData(prev => ({ ...prev, id: formatId(prev.id) }))}
              className="bg-accent/10 border-border/50 h-10 font-mono text-tiny font-bold pr-20"
              placeholder="workflow_unique_id"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/id:opacity-100 transition-opacity">
               <span className="text-micro font-mono text-primary font-black px-1.5 py-0.5 rounded bg-primary/10">ID SAFE</span>
            </div>
          </div>
          <p className="text-micro text-muted-foreground/60 italic ml-1">Lower case, no spaces. Used in technical references.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">Workflow Name</label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="bg-accent/10 border-border/50 h-10 font-bold"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">Description</label>
          <textarea 
            className="flex min-h-[100px] w-full rounded-md border border-border/50 bg-accent/10 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What does this workflow do?"
          />
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 mt-2">
           <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
           <p className="text-tiny text-blue-500 leading-relaxed font-medium">
             Changing the ID will create a new workflow record in the database. Existing execution logs will remain tied to the old ID.
           </p>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-accent/10 flex justify-end gap-2">
         <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-xs font-bold px-4">Cancel</Button>
         <Button variant="default" size="sm" onClick={handleSave} className="rounded-full text-xs font-bold px-5 gap-1.5 h-8">
            <Save className="w-3.5 h-3.5" />
            Update Metadata
         </Button>
      </div>
    </div>
  );
};
