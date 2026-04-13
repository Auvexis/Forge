import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Plus, X, Zap } from "lucide-react";
import type { NodeEditorProps } from "./types";
import type { EventNode } from "../../types/workflow-types";

const LABEL_CLASS =
  "text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1";

export function EmitEventEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as EventNode;
  const mapping = data.payloadMapping ?? {};
  const entries = Object.entries(mapping);

  const addEntry = () => {
    const key = `field${entries.length + 1}`;
    updateNodeData({ payloadMapping: { ...mapping, [key]: "" } });
  };

  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      next[k === oldKey ? newKey : k] = v;
    }
    updateNodeData({ payloadMapping: next });
  };

  const updateValue = (key: string, value: string) => {
    updateNodeData({ payloadMapping: { ...mapping, [key]: value } });
  };

  const removeEntry = (key: string) => {
    const next = { ...mapping };
    delete next[key];
    updateNodeData({ payloadMapping: next });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Node Name */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Step Name</label>
        <Input
          value={data.name ?? ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="Emit Event"
          className="h-10 font-bold bg-accent/5 border-border/50"
        />
      </div>

      {/* Event Name */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Event Name</label>
        <div className="relative">
          <Zap className="absolute left-3 top-2.5 w-4 h-4 text-yellow-500" />
          <Input
            value={data.eventName ?? ""}
            onChange={(e) => updateNodeData({ eventName: e.target.value })}
            placeholder="video.uploaded"
            className="h-10 font-mono pl-9 bg-accent/5 border-border/50 text-yellow-500 font-bold"
          />
        </div>
        <p className="text-[10px] text-muted-foreground italic ml-1">
          All active workflows with an Event trigger listening for this name
          will be executed.
        </p>
      </div>

      {/* Payload Mapping */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className={LABEL_CLASS}>Payload</label>
          <p className="text-[10px] text-muted-foreground ml-1 opacity-70 italic">
            Map context values to event payload fields. Values support{"  "}
            {"{{ template }}"} expressions.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {entries.map(([key, value], i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 p-3 border border-border/50 rounded-xl bg-accent/5"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex-1">
                  Payload Key
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive/60 hover:text-destructive"
                  onClick={() => removeEntry(key)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Input
                defaultValue={key}
                onBlur={(e) => {
                  if (e.target.value !== key) updateKey(key, e.target.value);
                }}
                placeholder="videoId"
                className="h-8 text-xs font-mono bg-background border-border/50"
              />
              <Input
                value={value}
                onChange={(e) => updateValue(key, e.target.value)}
                placeholder="{{ steps.upload.output.videoId }}"
                className="h-8 text-xs font-mono bg-background border-border/50 text-yellow-500/90"
              />
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-1 rounded-xl border-dashed h-9 font-black text-[10px] uppercase tracking-widest"
          onClick={addEntry}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Payload Field
        </Button>
      </div>

      {/* Preview */}
      {data.eventName && (
        <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1.5">
            Preview
          </p>
          <pre className="text-[10px] font-mono text-yellow-400/80 whitespace-pre-wrap">
            {JSON.stringify(
              {
                event: data.eventName,
                payload: Object.fromEntries(
                  entries.map(([k, v]) => [k, v || "…"]),
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
