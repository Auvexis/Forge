import { Input } from "~/components/ui/input";
import { GitBranch } from "lucide-react";
import type { IfNode } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";

export function IfEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as IfNode;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-mini! font-black uppercase tracking-widest text-muted-foreground ml-1">
          Step Name
        </label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Name this condition"
          className="bg-accent/10 border-border/50 h-10 font-bold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-3.5 h-3.5 text-violet-500" />
          <label className="text-mini font-black uppercase tracking-widest text-muted-foreground">
            Condition Expression
          </label>
        </div>
        <div className="flex items-center gap-2 p-2 text-mini bg-violet-500/5 border border-violet-500/10 rounded-lg text-violet-500">
          <span className="font-bold">
            JS expression evaluated against{" "}
            <code className="text-micro">trigger</code>,{" "}
            <code className="text-micro">steps</code>,{" "}
            <code className="text-micro">variables</code>
          </span>
        </div>
        <textarea
          value={data.condition || ""}
          onChange={(e) => updateNodeData({ condition: e.target.value })}
          placeholder={`steps.prevStep.output.status === 200`}
          className="flex min-h-[80px] w-full rounded-lg border border-border/50 bg-background px-3 py-3 text-xs font-mono ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-border/50">
        <span className="text-mini font-black uppercase tracking-widest text-muted-foreground">
          Output Branches
        </span>
        <div className="flex gap-3 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-500">Then (true)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-500">Else (false)</span>
          </div>
        </div>
        <p className="text-mini text-muted-foreground italic leading-relaxed mt-1">
          Connect the green handle (top) for the "true" path and the red handle
          (bottom) for the "false" path.
        </p>
      </div>
    </div>
  );
}
