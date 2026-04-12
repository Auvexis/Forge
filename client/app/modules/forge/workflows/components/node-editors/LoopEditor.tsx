import { Input } from "~/components/ui/input";
import { Repeat } from "lucide-react";
import type { LoopNode } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";

export function LoopEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as LoopNode;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Step Name
        </label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Name this loop"
          className="bg-accent/10 border-border/50 h-10 font-bold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Repeat className="w-3.5 h-3.5 text-cyan-500" />
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Collection Expression
          </label>
        </div>
        <div className="flex items-center gap-2 p-2 text-[10px] bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-cyan-500">
          <span className="font-bold">
            Template pointing to an array, e.g.{" "}
            <code className="text-[9px]">{"{{ steps.fetch.output.items }}"}</code>
          </span>
        </div>
        <Input
          value={data.collection || ""}
          onChange={(e) => updateNodeData({ collection: e.target.value })}
          placeholder="{{ steps.prevStep.output.items }}"
          className="bg-background border-border/50 h-10 font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Max Iterations (Safety Limit)
        </label>
        <Input
          type="number"
          value={data.maxIterations || 1000}
          onChange={(e) =>
            updateNodeData({
              maxIterations: parseInt(e.target.value) || 1000,
            })
          }
          className="bg-accent/10 border-border/50 h-10 font-bold"
          min={1}
          max={10000}
        />
      </div>

      <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-border/50">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Loop Variables
        </span>
        <div className="flex flex-col gap-1 mt-1">
          <code className="text-[10px] font-mono text-cyan-500">$item — current item</code>
          <code className="text-[10px] font-mono text-cyan-500">$index — current index</code>
          <code className="text-[10px] font-mono text-cyan-500">$total — collection length</code>
        </div>
        <p className="text-[10px] text-muted-foreground italic leading-relaxed mt-1">
          Connect the cyan handle (top) for the loop body and the gray handle
          (bottom) for the "done" path.
        </p>
      </div>
    </div>
  );
}
