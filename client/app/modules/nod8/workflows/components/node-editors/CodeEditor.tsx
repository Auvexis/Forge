import { Input } from "~/components/ui/input";
import { Code2 } from "lucide-react";
import type { CodeNode } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";

export function CodeEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as CodeNode;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-mini! font-black uppercase tracking-widest text-muted-foreground ml-1">
          Step Name
        </label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Name this code block"
          className="bg-accent/10 border-border/50 h-10 font-bold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <label className="text-mini! font-black uppercase tracking-widest text-muted-foreground">
            JavaScript Code
          </label>
        </div>
        <div className="flex items-center gap-2 p-2 text-mini! bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-500">
          <span className="font-bold">
            Available: <code className="text-micro!">context.trigger</code>,{" "}
            <code className="text-micro!">context.steps</code>,{" "}
            <code className="text-micro!">variables</code>
          </span>
        </div>
        <textarea
          value={data.script || ""}
          onChange={(e) => updateNodeData({ script: e.target.value })}
          placeholder={`// Access context and variables\nconst items = context.steps.prevStep.output;\nconst result = items.filter(i => i.active);\nreturn result;`}
          className="flex min-h-[200px] w-full rounded-lg border border-border/50 bg-background px-3 py-3 text-xs font-mono ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
