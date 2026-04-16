import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { X, Plus, Copy, Check, RefreshCw } from "lucide-react";
import type { WorkflowTrigger } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "~/components/ui/combobox";
import { API_BASE_URL } from "~/shared/constants";

const TRIGGER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "webhook", label: "Webhook" },
  { value: "cron", label: "Cron / Schedule" },
  { value: "event", label: "Event" },
];

const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at 9 AM", value: "0 9 * * *" },
  { label: "Every Mon–Fri at 9 AM", value: "0 9 * * 1-5" },
  { label: "Every Sunday at noon", value: "0 12 * * 0" },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

function humanizeCron(expression: string): string {
  if (!expression) return "";
  try {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return "Invalid expression";
    const [min, hour, dom, month, dow] = parts;
    if (
      min === "*" &&
      hour === "*" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every minute";
    if (
      min === "0" &&
      hour === "*" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every hour at minute 0";
    if (
      min === "0" &&
      hour === "0" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every day at midnight";
    if (dom === "*" && month === "*" && dow === "*")
      return `Every day at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    if (dom === "*" && month === "*" && dow !== "*")
      return `On day(s) ${dow} at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    return expression;
  } catch {
    return "";
  }
}

export function TriggerEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as WorkflowTrigger;
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const webhookPath = data.webhookPath || "";
  const webhookUrl = webhookPath
    ? `${API_BASE_URL}/webhooks/${webhookPath}`
    : `${API_BASE_URL}/webhooks/<auto-assigned-on-save>`;
  
  const allowedMethods: string[] = data.webhookMethods ?? ["POST"];

  const toggleMethod = (method: string) => {
    if (allowedMethods.includes(method)) {
      const next = allowedMethods.filter((m) => m !== method);
      updateNodeData({ webhookMethods: next.length ? next : ["POST"] });
    } else {
      updateNodeData({ webhookMethods: [...allowedMethods, method] });
    }
  };

  const copyToClipboard = async (text: string, cb: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    cb(true);
    setTimeout(() => cb(false), 2000);
  };

  const humanCron = humanizeCron(data.cronExpression ?? "");

  return (
    <div className="flex flex-col gap-6">
      {/* Trigger Type */}
      <div className="flex flex-col gap-2">
        <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
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

      {/* ─────────── MANUAL ─────────── */}
      {data.type === "manual" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Expected Manual Inputs
            </label>
            <p className="text-mini text-muted-foreground ml-1 opacity-70 italic">
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
                  <label className="flex items-center gap-2 text-mini font-bold bg-background border border-border rounded-lg px-3 uppercase tracking-tighter">
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
            className="mt-1 rounded-xl border-dashed h-9 font-black text-mini uppercase tracking-widest"
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

      {/* ─────────── WEBHOOK ─────────── */}
      {data.type === "webhook" && (
        <div className="flex flex-col gap-4">
          {/* URL display */}
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-accent/10 border border-border/50 rounded-xl font-mono text-mini break-all select-all text-muted-foreground">
                {webhookUrl}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
              >
                {copiedUrl ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
            <p className="text-mini text-muted-foreground italic ml-1">
              Save the workflow to auto-generate a unique webhook path.
            </p>
          </div>

          {/* HTTP Methods */}
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Allowed HTTP Methods
            </label>
            <div className="flex gap-2 flex-wrap">
              {HTTP_METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMethod(m)}
                  className={`px-3 py-1.5 rounded-lg text-mini font-black uppercase tracking-wider border shadow-none h-auto ${
                    allowedMethods.includes(m)
                      ? "bg-primary/20 border-primary/50 text-primary hover:bg-primary/25 hover:text-primary"
                      : "bg-accent/10 border-border/50 text-muted-foreground hover:bg-accent/15 hover:text-muted-foreground"
                  }`}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Secret */}
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              HMAC Secret{" "}
              <span className="text-micro opacity-50 normal-case font-normal">
                (recommended)
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={data.webhookSecret ?? ""}
                onChange={(e) =>
                  updateNodeData({ webhookSecret: e.target.value })
                }
                placeholder="my-secret-key"
                className="h-10 font-mono bg-accent/5 border-border/50 flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
                title="Generate random secret"
                onClick={() => {
                  const arr = new Uint8Array(16);
                  crypto.getRandomValues(arr);
                  const secret = Array.from(arr)
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
                  updateNodeData({ webhookSecret: secret });
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-mini text-muted-foreground italic ml-1">
              Validate requests using{" "}
              <code className="font-mono">X-Nod8-Signature: sha256=…</code>
            </p>
          </div>
        </div>
      )}

      {/* ─────────── CRON ─────────── */}
      {data.type === "cron" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Cron Expression
            </label>
            <Input
              value={data.cronExpression || ""}
              onChange={(e) =>
                updateNodeData({ cronExpression: e.target.value })
              }
              placeholder="* * * * *"
              className="h-10 font-mono bg-accent/5 border-border/50"
            />
            {humanCron && (
              <p className="text-mini text-primary/80 ml-1 font-bold">
                ↳ {humanCron}
              </p>
            )}
            <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg text-mini text-blue-400">
              Format:{" "}
              <code className="font-mono">minute hour day month weekday</code>
              <br />
              Example:{" "}
              <code className="font-mono">0 9 * * 1-5</code> (Mon–Fri at 9:00
              AM)
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CRON_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant="ghost"
                  onClick={() => updateNodeData({ cronExpression: p.value })}
                  className={`flex h-auto w-full flex-col items-stretch p-2.5 rounded-xl border text-left font-normal shadow-none transition-all hover:border-primary/40 ${
                    data.cronExpression === p.value
                      ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/15 hover:text-primary"
                      : "bg-accent/5 border-border/40 text-muted-foreground hover:bg-accent/10 hover:text-muted-foreground"
                  }`}
                >
                  <span className="text-mini font-bold">{p.label}</span>
                  <code className="text-micro font-mono opacity-70">
                    {p.value}
                  </code>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── EVENT ─────────── */}
      {data.type === "event" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
              Internal Event Name
            </label>
            <Input
              value={data.eventName || ""}
              onChange={(e) => updateNodeData({ eventName: e.target.value })}
              placeholder="video.uploaded"
              className="h-10 font-bold font-mono bg-accent/5 border-border/50 text-yellow-500"
            />
            <p className="text-mini text-muted-foreground italic ml-1">
              This workflow will run whenever an{" "}
              <strong>Emit Event</strong> node or the{" "}
              <code className="font-mono">/events/emit</code> API emits this
              event name.
            </p>
          </div>

          <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <p className="text-mini font-black uppercase tracking-widest text-yellow-500 mb-1">
              How it works
            </p>
            <p className="text-mini text-muted-foreground leading-relaxed">
              Use an <strong>Emit Event</strong> node in another workflow to
              trigger this one. The emitted payload will be available in{" "}
              <code className="font-mono text-yellow-400">
                {"{{ trigger.payload }}"}
              </code>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
