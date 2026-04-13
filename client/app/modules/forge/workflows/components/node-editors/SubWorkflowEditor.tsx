import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { X, Plus, Layers } from "lucide-react";
import type { SubWorkflowNode } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";

export function SubWorkflowEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as SubWorkflowNode;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
          Step Name
        </label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Name this sub-workflow call"
          className="bg-accent/10 border-border/50 h-10 font-bold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-3.5 h-3.5 text-rose-500" />
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground">
            Target Workflow ID
          </label>
        </div>
        <Input
          value={data.workflowId || ""}
          onChange={(e) => updateNodeData({ workflowId: e.target.value })}
          placeholder="wf_123456789"
          className="bg-background border-border/50 h-10 font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Input Mapping
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-micro font-black uppercase px-2"
            onClick={() => {
              const current = data.inputMapping || {};
              const num = Object.keys(current).length;
              updateNodeData({
                inputMapping: { ...current, [`input${num}`]: "" },
              });
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <p className="text-mini text-muted-foreground ml-1 opacity-70 italic">
          Map parent context paths to child trigger payload keys.
        </p>

        <div className="flex flex-col gap-2">
          {Object.entries(data.inputMapping || {}).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <Input
                defaultValue={key}
                className="h-8 text-xs font-bold flex-1 bg-accent/10 border-border/50"
                placeholder="Child key"
                onBlur={(e) => {
                  if (e.target.value === key) return;
                  const newMapping = { ...data.inputMapping };
                  const val = newMapping[key];
                  delete newMapping[key];
                  newMapping[e.target.value] = val;
                  updateNodeData({ inputMapping: newMapping });
                }}
              />
              <span className="text-mini text-muted-foreground font-bold">←</span>
              <Input
                value={value as string}
                className="h-8 text-xs font-mono flex-1 bg-background border-border/50"
                placeholder="steps.x.output.y"
                onChange={(e) =>
                  updateNodeData({
                    inputMapping: { ...data.inputMapping, [key]: e.target.value },
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive/70 hover:text-destructive rounded-full shrink-0"
                onClick={() => {
                  const newMapping = { ...data.inputMapping };
                  delete newMapping[key];
                  updateNodeData({ inputMapping: newMapping });
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
