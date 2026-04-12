import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Check, Search } from "lucide-react";
import type { PluginNode } from "../../types/workflow-types";
import type { NodeEditorProps } from "./types";
import { useForge } from "~/providers/ForgeProvider";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "~/components/ui/combobox";
import {
  resolveSchemaTree,
  resolveTriggerPaths,
  type SchemaPath,
} from "../../utils/schemaResolver";

// ──────────── Variable Tree ────────────

/**
 * A searchable variable tree that shows all injectable paths from all
 * upstream nodes and the trigger. Each path is a clickable chip that
 * appends `{{ path }}` to the target input.
 */
function VariableTree({
  paramKey,
  upstreamNodes,
  nodes,
  onInject,
}: {
  paramKey: string;
  upstreamNodes: NodeEditorProps["upstreamNodes"];
  nodes: NodeEditorProps["nodes"];
  onInject: (paramKey: string, path: string) => void;
}) {
  const { plugins } = useForge();
  const [search, setSearch] = useState("");

  // Collect all schema paths from all upstream nodes
  const allPaths: SchemaPath[] = [];

  for (const upNode of upstreamNodes) {
    if (upNode.id === "trigger") {
      const triggerData = upNode.data as any;
      const triggerPaths = resolveTriggerPaths(triggerData.schema);
      allPaths.push(...triggerPaths);
      // Also offer the whole trigger payload
      if (!triggerData.schema || Object.keys(triggerData.schema).length === 0) {
        allPaths.push({
          path: "trigger",
          label: "trigger.payload",
          type: "object",
          sourceNodeName: "Trigger",
        });
      }
      continue;
    }

    const upData = upNode.data as any;
    const nodeName: string = upData.name || upNode.id;

    if (!upData.pluginId) {
      // Non-plugin node: offer generic .output
      allPaths.push({
        path: `steps.${upNode.id}.output`,
        label: "output",
        type: "any",
        sourceNodeName: nodeName,
      });
      continue;
    }

    // Plugin node: resolve full schema tree
    const upPlugin = plugins.find((p) => p.id === upData.pluginId);
    const upMethod = upPlugin?.manifest.methods[upData.action];
    if (upMethod?.responseSchema) {
      const paths = resolveSchemaTree(upNode.id, nodeName, upMethod.responseSchema);
      allPaths.push(...paths);
    } else {
      allPaths.push({
        path: `steps.${upNode.id}.output`,
        label: "output",
        type: "any",
        sourceNodeName: nodeName,
      });
    }
  }

  const filtered = search
    ? allPaths.filter(
        (p) =>
          p.path.toLowerCase().includes(search.toLowerCase()) ||
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.sourceNodeName.toLowerCase().includes(search.toLowerCase()),
      )
    : allPaths;

  if (allPaths.length === 0) return null;

  // Group by sourceNodeName
  const grouped = new Map<string, SchemaPath[]>();
  for (const p of filtered) {
    const group = grouped.get(p.sourceNodeName) ?? [];
    group.push(p);
    grouped.set(p.sourceNodeName, group);
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      {/* Search bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border/50 bg-background">
        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
        <input
          className="flex-1 bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/50"
          placeholder="Search variables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grouped chips */}
      {Array.from(grouped.entries()).map(([groupName, paths]) => (
        <div key={groupName} className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 ml-0.5">
            {groupName}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {paths.map((p) => (
              <button
                key={p.path}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition-all active:scale-95 font-bold flex items-center gap-1 max-w-full"
                title={p.path}
                onClick={() => onInject(paramKey, p.path)}
              >
                <Check className="w-2.5 h-2.5 opacity-50 shrink-0" />
                <span className="truncate">{p.label}</span>
                <span className="opacity-40 text-[8px] shrink-0">{p.type}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-[10px] text-muted-foreground/50 italic px-1">
          No variables match "{search}"
        </p>
      )}
    </div>
  );
}

// ──────────── PluginEditor ────────────

export function PluginEditor({
  node,
  nodes,
  edges,
  updateNodeData,
  injectVariable,
  upstreamNodes,
}: NodeEditorProps) {
  const { plugins } = useForge();
  const data = node.data as unknown as PluginNode;
  const selectedPlugin = plugins.find((p) => p.id === data.pluginId);
  const selectedAction = selectedPlugin?.manifest.methods[data.action];

  return (
    <div className="flex flex-col gap-6">
      {/* Step name */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Step Name
        </label>
        <Input
          value={data.name || ""}
          onChange={(e) => updateNodeData({ name: e.target.value })}
          placeholder="What does this step do?"
          className="bg-accent/10 border-border/50 h-10 font-bold"
        />
      </div>

      {/* Plugin selector */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Integration (Plugin)
        </label>
        <Combobox
          value={data.pluginId || undefined}
          onValueChange={(val) =>
            updateNodeData({ pluginId: val || "", action: "", params: {} })
          }
        >
          <ComboboxInput
            className="w-full h-10 bg-accent/10 border-border/50 font-bold text-sm pointer-events-auto"
            placeholder="Select Integration..."
          />
          <ComboboxContent className="z-[100] pointer-events-auto">
            <ComboboxList>
              {plugins.map((p) => (
                <ComboboxItem
                  key={p.id}
                  value={p.id}
                  className="text-sm font-bold py-2 px-3 cursor-pointer"
                >
                  {p.manifest.metadata.name}
                </ComboboxItem>
              ))}
            </ComboboxList>
            <ComboboxEmpty>No integrations found.</ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Action selector */}
      {selectedPlugin && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Action
          </label>
          <Combobox
            value={data.action || undefined}
            onValueChange={(val) =>
              updateNodeData({ action: val || "", params: {} })
            }
          >
            <ComboboxInput
              className="w-full h-10 bg-accent/10 border-border/50 font-bold text-sm pointer-events-auto"
              placeholder="Select Action..."
            />
            <ComboboxContent className="z-[100] pointer-events-auto">
              <ComboboxList>
                {Object.entries(selectedPlugin.manifest.methods || {}).map(
                  ([key, method]) => (
                    <ComboboxItem
                      key={key}
                      value={key}
                      className="text-sm font-bold py-2 px-3 cursor-pointer"
                    >
                      {method.metadata.label || key}
                    </ComboboxItem>
                  ),
                )}
              </ComboboxList>
              <ComboboxEmpty>No actions found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>
      )}

      {/* Parameters */}
      {selectedAction && (
        <div className="flex flex-col gap-5 mt-2">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            <h3 className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">
              Parameters
            </h3>
          </div>

          {Object.entries(selectedAction.parameters?.properties || {}).map(
            ([paramKey, paramVal]) => {
              const isRequired = (
                selectedAction.parameters?.required ?? []
              ).includes(paramKey);

              return (
                <div
                  key={paramKey}
                  className="flex flex-col gap-3 p-4 rounded-xl bg-accent/5 border border-border/50"
                >
                  {/* Param header */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {(paramVal as any)["x-label"] || paramKey}
                      </span>
                      {(paramVal as any).description && (
                        <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                          {(paramVal as any).description}
                        </span>
                      )}
                      {isRequired && (
                        <span className="text-[9px] font-black uppercase text-destructive/80 leading-none mt-0.5">
                          Required field
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] bg-accent/20 px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black tracking-tighter border border-border/30">
                      {(paramVal as any).type}
                    </span>
                  </div>

                  {/* Enum → Combobox */}
                  {(paramVal as any).enum ? (
                    <Combobox
                      value={data.params?.[paramKey] || undefined}
                      onValueChange={(val) =>
                        updateNodeData({
                          params: { ...(data.params || {}), [paramKey]: val },
                        })
                      }
                    >
                      <ComboboxInput
                        className="w-full h-10 font-bold text-sm bg-background border-border/50 pointer-events-auto"
                        placeholder={`Select ${(paramVal as any)["x-label"] || paramKey}...`}
                      />
                      <ComboboxContent className="z-[100] pointer-events-auto">
                        <ComboboxList>
                          {((paramVal as any).enum as string[]).map((val) => (
                            <ComboboxItem
                              key={val}
                              value={val}
                              className="text-sm font-bold py-2 px-3 cursor-pointer"
                            >
                              {val}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  ) : (
                    <Input
                      className="font-bold text-sm bg-background border-border/50 h-10"
                      value={data.params?.[paramKey] || ""}
                      onChange={(e) =>
                        updateNodeData({
                          params: {
                            ...(data.params || {}),
                            [paramKey]: e.target.value,
                          },
                        })
                      }
                      placeholder={
                        (paramVal as any).description
                          ? `e.g. ${(paramVal as any).default ?? ""}`
                          : `Enter value for ${paramKey}`
                      }
                    />
                  )}

                  {/* Variable tree — only shown when there are upstream nodes */}
                  {upstreamNodes.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1.5 opacity-60">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Map variables
                      </span>
                      <VariableTree
                        paramKey={paramKey}
                        upstreamNodes={upstreamNodes}
                        nodes={nodes}
                        onInject={injectVariable}
                      />
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
