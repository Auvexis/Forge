import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { X, Plus } from "lucide-react";
import type { WorkflowTrigger } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "~/components/ui/combobox";

const TRIGGER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "webhook", label: "Webhook" },
  { value: "cron", label: "Cron / Schedule" },
  { value: "event", label: "Event" },
];

export function TriggerEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as WorkflowTrigger;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Trigger Type
        </label>
        <Combobox
          value={data.type || "manual"}
          onValueChange={(val) => updateNodeData({ type: val as any })}
        >
          <ComboboxInput
            className="w-full h-10 font-bold bg-accent/10 border-border/50 text-sm pointer-events-auto"
            placeholder="Select trigger type..."
          />
          <ComboboxContent className="z-[100] pointer-events-auto">
            <ComboboxList>
              {TRIGGER_OPTIONS.map((opt) => (
                <ComboboxItem
                  key={opt.value}
                  value={opt.value}
                  className="font-bold text-sm py-2 px-3 cursor-pointer"
                >
                  {opt.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Manual inputs schema builder */}
      {data.type === "manual" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Expected Manual Inputs
            </label>
            <p className="text-[10px] text-muted-foreground ml-1 opacity-70 italic">
              Fields user must fill when running manually.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {Object.entries(data.schema || {}).map(([key, field], index) => (
              <div
                key={index}
                className="flex flex-col gap-2 p-3 border border-border/50 rounded-xl bg-accent/5"
              >
                <div className="flex justify-between items-center bg-accent/10 -m-3 p-3 rounded-t-xl border-b border-border/30 mb-1">
                  <Input
                    defaultValue={key}
                    className="h-8 text-xs w-[180px] font-medium px-2! bg-input border border-border focus-visible:ring-0 p-0"
                    onBlur={(e) => {
                      if (e.target.value === key) return;
                      const newSchema = { ...data.schema };
                      const val = newSchema[key];
                      delete newSchema[key];
                      newSchema[e.target.value] = val;
                      updateNodeData({ schema: newSchema });
                    }}
                    placeholder="Field name"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={() => {
                      const newSchema = { ...data.schema };
                      delete newSchema[key];
                      updateNodeData({ schema: newSchema });
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Combobox
                    value={(field as any).type}
                    onValueChange={(val) =>
                      updateNodeData({
                        schema: {
                          ...data.schema,
                          [key]: { ...(field as any), type: val as any },
                        },
                      })
                    }
                  >
                    <ComboboxInput
                      className="flex-1 h-8 bg-background border border-border text-xs font-bold pointer-events-auto"
                      placeholder="Type"
                    />
                    <ComboboxContent className="z-[100] pointer-events-auto">
                      <ComboboxList>
                        {["string", "number", "file"].map((t) => (
                          <ComboboxItem
                            key={t}
                            value={t}
                            className="text-xs font-bold py-2 px-3 cursor-pointer"
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <label className="flex items-center gap-2 text-[10px] font-bold bg-background border border-border rounded-lg px-3 uppercase tracking-tighter">
                    <input
                      type="checkbox"
                      checked={(field as any).required}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      onChange={(e) =>
                        updateNodeData({
                          schema: {
                            ...data.schema,
                            [key]: {
                              ...(field as any),
                              required: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Req
                  </label>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-1 rounded-xl border-dashed h-9 font-black text-[10px] uppercase tracking-widest"
            onClick={() => {
              const num = Object.keys(data.schema || {}).length;
              updateNodeData({
                schema: {
                  ...(data.schema || {}),
                  [`field${num}`]: { type: "string", required: false },
                },
              });
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Expected Input
          </Button>
        </div>
      )}

      {/* Webhook URL display */}
      {data.type === "webhook" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Webhook URL
            </label>
            <div className="p-3 bg-accent/10 border border-border/50 rounded-xl font-mono text-[10px] break-all select-all">
              {import.meta.env.VITE_API_URL || "http://localhost:3000"}/wf/
              {node.id}/webhook
            </div>
            <p className="text-[10px] text-muted-foreground italic ml-1">
              The URL where external services should send data.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Security (Secret)
            </label>
            <Input
              placeholder="Optional Webhook SecretToken"
              className="h-10 font-bold bg-accent/5 border-border/50"
            />
          </div>
        </div>
      )}

      {/* Cron expression */}
      {data.type === "cron" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Cron Expression
            </label>
            <Input
              value={data.cronExpression || ""}
              onChange={(e) => updateNodeData({ cronExpression: e.target.value })}
              placeholder="* * * * *"
              className="h-10 font-mono bg-accent/5 border-border/50"
            />
            <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] text-blue-500">
              Format: <code>minute hour day month day-of-week</code>
              <br />
              Example: <code>0 9 * * 1-5</code> (Mon-Fri at 9:00 AM)
            </div>
          </div>
        </div>
      )}

      {/* Event name */}
      {data.type === "event" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Internal Event Name
            </label>
            <Input
              value={data.eventName || ""}
              onChange={(e) => updateNodeData({ eventName: e.target.value })}
              placeholder="order.created"
              className="h-10 font-bold bg-accent/5 border-border/50"
            />
            <p className="text-[10px] text-muted-foreground italic ml-1">
              Listen for events emitted by other workflows or plugins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
