import { Input } from "~/components/ui/input";
import { Target } from "lucide-react";
import type { NodeEditorProps } from "./types";
import type { EventListenerNode } from "../../types/workflow-types";

const LABEL_CLASS =
  "text-mini font-black uppercase tracking-widest text-muted-foreground ml-1";

export function EventListenerEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as EventListenerNode;

  return (
    <div className="flex flex-col gap-5">
      {/* Node Name */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Step Name</label>
        <Input
          value={data.name ?? ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Event Listener"
          className="h-10 font-bold bg-accent/5 border-border/50"
        />
      </div>

      {/* Event Name */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Listen to Event</label>
        <div className="relative">
          <Target className="absolute left-3 top-2.5 w-4 h-4 text-pink-500" />
          <Input
            value={data.eventName ?? ""}
            onChange={(e) => updateNodeData({ eventName: e.target.value })}
            placeholder="video.uploaded"
            className="h-10 font-mono pl-9 bg-accent/5 border-border/50 text-foreground font-bold"
          />
        </div>
        <p className="text-mini text-muted-foreground italic ml-1">
          When an Emit Event node with this exact name executes in this workflow, this sub-flow will trigger automatically.
        </p>
      </div>
    </div>
  );
}
