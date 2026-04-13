import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "~/components/ui/combobox";
import { Button } from "~/components/ui/button";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import type { NodeEditorProps } from "./types";
import type { HttpNode } from "../../types/workflow-types";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BODY_TYPES = [
  { value: "json", label: "JSON" },
  { value: "form", label: "Form Encoded" },
  { value: "raw", label: "Raw" },
];
const RESPONSE_TYPES = [
  { value: "json", label: "JSON (auto-parse)" },
  { value: "text", label: "Plain Text" },
];

const LABEL_CLASS =
  "text-mini font-black uppercase tracking-widest text-muted-foreground ml-1";

export function HttpEditor({ node, updateNodeData }: NodeEditorProps) {
  const data = node.data as unknown as HttpNode;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const headers = data.headers ?? {};
  const headerEntries = Object.entries(headers);

  const hasBody = ["POST", "PUT", "PATCH"].includes(data.method ?? "GET");

  const addHeader = () => {
    const key = `Header_${Object.keys(headers).length + 1}`;
    updateNodeData({ headers: { ...headers, [key]: "" } });
  };

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      next[k === oldKey ? newKey : k] = v;
    }
    updateNodeData({ headers: next });
  };

  const updateHeaderValue = (key: string, value: string) => {
    updateNodeData({ headers: { ...headers, [key]: value } });
  };

  const removeHeader = (key: string) => {
    const next = { ...headers };
    delete next[key];
    updateNodeData({ headers: next });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Node Name */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Step Name</label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="HTTP Request"
          className="h-10 font-bold bg-accent/5 border-border/50"
        />
      </div>

      {/* Method + URL */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Method & URL</label>
        <div className="flex gap-2">
          <Combobox
            value={data.method ?? "GET"}
            onValueChange={(val) => updateNodeData({ method: val as any })}
          >
            <ComboboxInput
              className="w-[100px] h-10 font-black bg-accent/10 border-border/50 text-sm pointer-events-auto shrink-0 text-orange-500"
              placeholder="GET"
            />
            <ComboboxContent className="z-[100] pointer-events-auto">
              <ComboboxList>
                {HTTP_METHODS.map((m) => (
                  <ComboboxItem
                    key={m}
                    value={m}
                    className="font-bold text-sm py-2 px-3 cursor-pointer"
                  >
                    {m}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          <Input
            value={data.url ?? ""}
            onChange={(e) => updateNodeData({ url: e.target.value })}
            placeholder="https://api.example.com/{{ steps.prev.output.id }}"
            className="h-10 font-mono text-xs bg-accent/5 border-border/50 flex-1"
          />
        </div>
        <p className="text-mini text-muted-foreground italic ml-1">
          Supports {"{{ template }}"} expressions from previous steps.
        </p>
      </div>

      {/* Headers */}
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS}>Headers</label>
        <div className="flex flex-col gap-2">
          {headerEntries.map(([key, value], i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                defaultValue={key}
                onBlur={(e) => {
                  if (e.target.value !== key)
                    updateHeaderKey(key, e.target.value);
                }}
                placeholder="Content-Type"
                className="h-8 text-xs font-mono flex-1 bg-accent/5 border-border/50"
              />
              <Input
                value={value}
                onChange={(e) => updateHeaderValue(key, e.target.value)}
                placeholder="application/json"
                className="h-8 text-xs font-mono flex-1 bg-accent/5 border-border/50"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0"
                onClick={() => removeHeader(key)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 rounded-xl border-dashed h-8 font-black text-mini uppercase tracking-widest"
          onClick={addHeader}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Header
        </Button>
      </div>

      {/* Body (POST/PUT/PATCH only) */}
      {hasBody && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 justify-between">
            <label className={LABEL_CLASS}>Request Body</label>
            <Combobox
              value={data.bodyType ?? "json"}
              onValueChange={(val) => updateNodeData({ bodyType: val as any })}
            >
              <ComboboxInput
                className="w-[130px] h-7 text-mini font-black bg-accent/10 border-border/50 pointer-events-auto"
                placeholder="JSON"
              />
              <ComboboxContent className="z-[100] pointer-events-auto">
                <ComboboxList>
                  {BODY_TYPES.map((t) => (
                    <ComboboxItem
                      key={t.value}
                      value={t.value}
                      className="text-xs font-bold py-2 px-3 cursor-pointer"
                    >
                      {t.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <Textarea
            value={data.body ?? ""}
            onChange={(e) => updateNodeData({ body: e.target.value })}
            placeholder={'{\n  "key": "{{ steps.prev.output.value }}"\n}'}
            className="font-mono text-xs min-h-[120px] resize-y bg-accent/5 border-border/50"
          />
        </div>
      )}

      {/* Advanced Settings */}
      <div className="flex flex-col gap-2">
        <button
          className="flex items-center gap-2 text-mini font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          Advanced Settings
        </button>

        {advancedOpen && (
          <div className="flex flex-col gap-4 p-4 bg-accent/5 rounded-xl border border-border/50 animate-in slide-in-from-top-2 duration-200">
            {/* Timeout */}
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS}>Timeout (ms)</label>
              <Input
                type="number"
                value={data.timeout ?? 30000}
                onChange={(e) =>
                  updateNodeData({ timeout: parseInt(e.target.value) || 30000 })
                }
                className="h-9 font-mono bg-background border-border/50"
              />
            </div>

            {/* Response Type */}
            <div className="flex flex-col gap-2">
              <label className={LABEL_CLASS}>Parse Response As</label>
              <Combobox
                value={data.responseType ?? "json"}
                onValueChange={(val) =>
                  updateNodeData({ responseType: val as any })
                }
              >
                <ComboboxInput
                  className="h-9 font-bold bg-background border-border/50 text-sm pointer-events-auto"
                  placeholder="JSON"
                />
                <ComboboxContent className="z-[100] pointer-events-auto">
                  <ComboboxList>
                    {RESPONSE_TYPES.map((t) => (
                      <ComboboxItem
                        key={t.value}
                        value={t.value}
                        className="font-bold text-sm py-2 px-3 cursor-pointer"
                      >
                        {t.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            {/* Follow Redirects */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.followRedirects !== false}
                onChange={(e) =>
                  updateNodeData({ followRedirects: e.target.checked })
                }
                className="w-4 h-4 rounded border-border"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Follow Redirects</span>
                <span className="text-mini text-muted-foreground">
                  Automatically follow 3xx HTTP redirects
                </span>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
