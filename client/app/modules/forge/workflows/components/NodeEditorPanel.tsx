import { useState, useEffect } from "react";
import { type Node, type Edge } from "@xyflow/react";
import { useForge } from "~/providers/ForgeProvider";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { X, Plus, Check, Code2, GitBranch, Repeat, Layers, Settings, ShieldCheck } from "lucide-react";
import { PluginMenuAuth } from "../../plugins/components/PluginMenuAuth";
import type {
  WorkflowNode,
  WorkflowTrigger,
  PluginNode,
  CodeNode,
  IfNode,
  LoopNode,
  SubWorkflowNode,
} from "../types/workflow-types";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "~/components/ui/combobox";

interface Props {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  onNodeIdChange: (id: string) => void;
  onClose: () => void;
}

export const NodeEditorPanel = ({
  nodeId,
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodeIdChange,
  onClose,
}: Props) => {
  const { plugins, refreshActivePluginStatus } = useForge();
  const [activeTab, setActiveTab] = useState<"settings" | "auth">("settings");

  const node = nodes.find((n) => n.id === nodeId);
  
  useEffect(() => {
    setActiveTab("settings");
  }, [nodeId]);

  if (!node) return null;

  // Detect if this is a plugin action node
  const dataType = (node.data as any).type as string | undefined;
  const pluginId = (node.data as any).pluginId as string | undefined;
  const isPluginNode = node.type === "action" && (!dataType || dataType === "plugin") && !!pluginId;

  // Refresh auth status when entering auth tab
  useEffect(() => {
    if (activeTab === "auth" && isPluginNode && pluginId) {
       refreshActivePluginStatus(pluginId).catch(console.error);
    }
  }, [activeTab, isPluginNode, pluginId, refreshActivePluginStatus]);

  const updateNodeData = (newData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, ...newData } as any };
        }
        return n;
      }),
    );
  };

  const handleIdChange = (newId: string) => {
    if (!newId || newId === nodeId) return;

    // Check for duplicates
    if (nodes.some((n) => n.id === newId)) {
        alert("A node with this ID already exists.");
        return;
    }

    // Update Node ID
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, id: newId } : n)));

    // Update all connected edges
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === nodeId) return { ...e, source: newId };
        if (e.target === nodeId) return { ...e, target: newId };
        return e;
      }),
    );

    // Update parent selection so panel doesn't close
    onNodeIdChange(newId);
  };

  // Traversal to find upstream nodes
  const getUpstreamNodes = (
    currentId: string,
    visited = new Set<string>(),
  ): Node[] => {
    if (visited.has(currentId)) return [];
    visited.add(currentId);

    const directEdges = edges.filter((e) => e.target === currentId);
    let upstream: Node[] = [];

    for (const edge of directEdges) {
      const parentNode = nodes.find((n) => n.id === edge.source);
      if (parentNode) {
        upstream.push(parentNode);
        upstream = upstream.concat(getUpstreamNodes(parentNode.id, visited));
      }
    }
    return upstream;
  };

  const upstreamNodes = getUpstreamNodes(nodeId);

  const injectVariable = (paramKey: string, variable: string) => {
    if (node.type !== "action") return;
    const currentParams = (node.data as any).params || {};
    const currentValue = currentParams[paramKey] || "";

    updateNodeData({
      params: {
        ...currentParams,
        [paramKey]: `${currentValue}{{ ${variable} }}`,
      },
    });
  };

  // ──────────── Editors ────────────

  // ──────────── Trigger Editor ────────────
  const renderTriggerEditor = () => {
    const data = node.data as any as WorkflowTrigger;
    const triggerOptions = [
      { value: "manual", label: "Manual" },
      { value: "webhook", label: "Webhook" },
      { value: "cron", label: "Cron / Schedule" },
      { value: "event", label: "Event" },
    ];

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
                {triggerOptions.map((opt) => (
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
              {Object.entries(data.schema || {}).map(
                ([key, field], index) => (
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
                        value={field.type}
                        onValueChange={(val) =>
                          updateNodeData({
                            schema: {
                              ...data.schema,
                              [key]: { ...field, type: val as any },
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
                            <ComboboxItem
                              value="string"
                              className="text-xs font-bold py-2 px-3 cursor-pointer"
                            >
                              String
                            </ComboboxItem>
                            <ComboboxItem
                              value="number"
                              className="text-xs font-bold py-2 px-3 cursor-pointer"
                            >
                              Number
                            </ComboboxItem>
                            <ComboboxItem
                              value="file"
                              className="text-xs font-bold py-2 px-3 cursor-pointer"
                            >
                              File
                            </ComboboxItem>
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <label className="flex items-center gap-2 text-[10px] font-bold bg-background border border-border rounded-lg px-3 uppercase tracking-tighter">
                        <input
                          type="checkbox"
                          checked={field.required}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          onChange={(e) =>
                            updateNodeData({
                              schema: {
                                ...data.schema,
                                [key]: {
                                  ...field,
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
                ),
              )}
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

        {data.type === "webhook" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Webhook URL
              </label>
              <div className="p-3 bg-accent/10 border border-border/50 rounded-xl font-mono text-[10px] break-all select-all">
                {import.meta.env.VITE_API_URL || "http://localhost:3000"}/wf/
                {nodeId}/webhook
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

        {data.type === "cron" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
              <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] text-blue-500">
                Format: <code>minute hour day month day-of-week</code>
                <br />
                Example: <code>0 9 * * 1-5</code> (Mon-Fri at 9:00 AM)
              </div>
            </div>
          </div>
        )}

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
  };

  // ──────────── Plugin Editor ────────────
  const renderPluginEditor = () => {
    const data = node.data as any as PluginNode;
    const selectedPlugin = plugins.find((p) => p.id === data.pluginId);
    const selectedAction = selectedPlugin?.manifest.methods[data.action];

    return (
      <div className="flex flex-col gap-6">
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
                  {Object.entries(
                    selectedPlugin.manifest.methods || {},
                  ).map(([key, method]) => (
                    <ComboboxItem
                      key={key}
                      value={key}
                      className="text-sm font-bold py-2 px-3 cursor-pointer"
                    >
                      {method.metadata.label || key}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No actions found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
        )}

        {selectedAction && (
          <div className="flex flex-col gap-5 mt-2">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <div className="w-1.5 h-4 bg-primary rounded-full" />
              <h3 className="text-[11px] font-black text-foreground/70 uppercase tracking-widest">
                Parameters
              </h3>
            </div>

            {(
              Object.entries(selectedAction.parameters || {}) as [
                string,
                any,
              ][]
            ).map(([paramKey, paramVal]) => (
              <div
                key={paramKey}
                className="flex flex-col gap-3 p-4 rounded-xl bg-accent/5 border border-border/50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                      {paramKey}
                    </span>
                    {paramVal.required && (
                      <span className="text-[9px] font-black uppercase text-destructive/80 leading-none mt-0.5">
                        Required field
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] bg-accent/20 px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black tracking-tighter border border-border/30">
                    {paramVal.type}
                  </span>
                </div>

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
                  placeholder={`Enter value for ${paramKey}`}
                />

                {upstreamNodes.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1.5 opacity-60">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Map variables
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {upstreamNodes.map((upNode) => {
                        if (upNode.id === "trigger") {
                          const triggerData =
                            upNode.data as unknown as WorkflowTrigger;
                          if (
                            triggerData.type === "manual" &&
                            triggerData.schema
                          ) {
                            return Object.keys(triggerData.schema).map(
                              (fieldName) => (
                                <button
                                  key={`trigger_${fieldName}`}
                                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] px-2.5 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95 font-bold"
                                  onClick={() =>
                                    injectVariable(
                                      paramKey,
                                      `trigger.${fieldName}`,
                                    )
                                  }
                                >
                                  trigger.{fieldName}
                                </button>
                              ),
                            );
                          }
                          return (
                            <button
                              key="trigger"
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] px-2.5 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95 font-bold"
                              onClick={() =>
                                injectVariable(paramKey, `trigger`)
                              }
                            >
                              trigger.payload
                            </button>
                          );
                        }

                        const upData = upNode.data as any as PluginNode;
                        if (!upData.pluginId) {
                          // Non-plugin upstream: just offer generic .output
                          return (
                            <button
                              key={upNode.id}
                              className="bg-accent/30 hover:bg-accent/50 text-foreground text-[10px] px-2.5 py-1.5 rounded-lg border border-border transition-all active:scale-95 font-bold"
                              onClick={() =>
                                injectVariable(
                                  paramKey,
                                  `steps.${upNode.id}.output`,
                                )
                              }
                            >
                              {upData.name || upNode.id}.output
                            </button>
                          );
                        }

                        const upPlugin = plugins.find(
                          (p) => p.id === upData.pluginId,
                        );
                        const upMethod =
                          upPlugin?.manifest.methods[upData.action];

                        let properties: Record<string, any> = {};
                        let suffix = "";

                        if (upMethod?.responseSchema) {
                          if (
                            upMethod.responseSchema.type === "object" &&
                            upMethod.responseSchema.properties
                          ) {
                            properties =
                              upMethod.responseSchema.properties;
                          } else if (
                            upMethod.responseSchema.type === "array" &&
                            upMethod.responseSchema.items?.properties
                          ) {
                            properties =
                              upMethod.responseSchema.items.properties;
                            suffix = "[0]";
                          }
                        }

                        if (Object.keys(properties).length > 0) {
                          return Object.entries(properties).map(
                            ([propKey, propVal]: [string, any]) => (
                              <button
                                key={`${upNode.id}_${propKey}`}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition-all active:scale-95 font-bold"
                                onClick={() =>
                                  injectVariable(
                                    paramKey,
                                    `steps.${upNode.id}.output${suffix}.${propKey}`,
                                  )
                                }
                                title={`From ${upData.name || upNode.id}`}
                              >
                                <span className="opacity-60">
                                  {upData.name || upNode.id}
                                </span>
                                <Check className="w-2.5 h-2.5 inline mx-1 opacity-40" />
                                {propVal.label || propKey}
                              </button>
                            ),
                          );
                        }

                        return (
                          <button
                            key={upNode.id}
                            className="bg-accent/30 hover:bg-accent/50 text-foreground text-[10px] px-2.5 py-1.5 rounded-lg border border-border transition-all active:scale-95 font-bold"
                            onClick={() =>
                              injectVariable(
                                paramKey,
                                `steps.${upNode.id}.output`,
                              )
                            }
                          >
                            {upData.name || upNode.id}.output
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ──────────── Code Editor ────────────
  const renderCodeEditor = () => {
    const data = node.data as any as CodeNode;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              JavaScript Code
            </label>
          </div>
          <div className="flex items-center gap-2 p-2 text-[10px] bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-500">
            <span className="font-bold">
              Available: <code className="text-[9px]">context.trigger</code>,{" "}
              <code className="text-[9px]">context.steps</code>,{" "}
              <code className="text-[9px]">variables</code>
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
  };

  // ──────────── If/Else Editor ────────────
  const renderIfEditor = () => {
    const data = node.data as any as IfNode;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Condition Expression
            </label>
          </div>
          <div className="flex items-center gap-2 p-2 text-[10px] bg-violet-500/5 border border-violet-500/10 rounded-lg text-violet-500">
            <span className="font-bold">
              JS expression evaluated against{" "}
              <code className="text-[9px]">trigger</code>,{" "}
              <code className="text-[9px]">steps</code>,{" "}
              <code className="text-[9px]">variables</code>
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
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Output Branches
          </span>
          <div className="flex gap-3 mt-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">
                Then (true)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-500">
                Else (false)
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic leading-relaxed mt-1">
            Connect the green handle (top) for the "true" path and the red
            handle (bottom) for the "false" path.
          </p>
        </div>
      </div>
    );
  };

  // ──────────── Loop Editor ────────────
  const renderLoopEditor = () => {
    const data = node.data as any as LoopNode;
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
              <code className="text-[9px]">
                {"{{ steps.fetch.output.items }}"}
              </code>
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
            <code className="text-[10px] font-mono text-cyan-500">
              $item — current item
            </code>
            <code className="text-[10px] font-mono text-cyan-500">
              $index — current index
            </code>
            <code className="text-[10px] font-mono text-cyan-500">
              $total — collection length
            </code>
          </div>
          <p className="text-[10px] text-muted-foreground italic leading-relaxed mt-1">
            Connect the cyan handle (top) for the loop body and the gray handle
            (bottom) for the "done" path.
          </p>
        </div>
      </div>
    );
  };

  // ──────────── SubWorkflow Editor ────────────
  const renderSubWorkflowEditor = () => {
    const data = node.data as any as SubWorkflowNode;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Input Mapping
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] font-black uppercase px-2"
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
          <p className="text-[10px] text-muted-foreground ml-1 opacity-70 italic">
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
                <span className="text-[10px] text-muted-foreground font-bold">
                  ←
                </span>
                <Input
                  value={value as string}
                  className="h-8 text-xs font-mono flex-1 bg-background border-border/50"
                  placeholder="steps.x.output.y"
                  onChange={(e) =>
                    updateNodeData({
                      inputMapping: {
                        ...data.inputMapping,
                        [key]: e.target.value,
                      },
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
  };

  // ──────────── Content Dispatcher ────────────
  const renderEditor = () => {
    if (node.type === "trigger") return renderTriggerEditor();

    switch (dataType) {
      case "code":
        return renderCodeEditor();
      case "if":
        return renderIfEditor();
      case "loop":
        return renderLoopEditor();
      case "subworkflow":
        return renderSubWorkflowEditor();
      default:
        return renderPluginEditor();
    }
  };

  // ──────────── Header label ────────────
  const headerLabel = (() => {
    if (node.type === "trigger") return "Trigger Configuration";

    switch (dataType) {
      case "code":
        return "Code Block";
      case "if":
        return "Conditional Branch";
      case "loop":
        return "Loop / ForEach";
      case "subworkflow":
        return "Sub-Workflow";
      default: {
        const pluginName = plugins.find(
          (p) => p.id === (node.data as any).pluginId,
        )?.manifest.metadata.name;
        return pluginName || "Action Settings";
      }
    }
  })();

   // Local state for ID to avoid re-render lag while typing
   const [localId, setLocalId] = useState(nodeId);

   useEffect(() => {
     setLocalId(nodeId);
   }, [nodeId]);

  return (
    <div className="absolute top-20 right-4 w-[400px] z-[60] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 max-h-[calc(100%-110px)]">
      <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20 shrink-0">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center justify-between">
             <h3 className="font-black text-[9px] uppercase tracking-widest text-foreground/50">
               Component Config
             </h3>
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/50">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">ID:</span>
                <input 
                  value={localId}
                  onChange={(e) => setLocalId(e.target.value)}
                  onBlur={() => handleIdChange(localId)}
                  onKeyDown={(e) => e.key === "Enter" && handleIdChange(localId)}
                  className="bg-transparent border-none outline-none text-[10px] font-mono font-black text-primary w-24"
                  spellCheck={false}
                />
             </div>
          </div>
          <span className="text-sm font-bold truncate max-w-[280px]">
            {headerLabel}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full ml-2"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {isPluginNode && (
         <div className="flex bg-accent/30 p-1.5 items-center justify-around border-b border-border transition-all">
            <Button 
              onClick={() => setActiveTab('settings')}
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs font-bold px-4"
            >
              <Settings size={12} />
              Parameters
            </Button>
            <Button 
              onClick={() => setActiveTab('auth')}
              variant={activeTab === 'auth' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs font-bold px-4"
            >
              <ShieldCheck size={12} />
              Authorization
            </Button>
         </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-2">
        {activeTab === 'auth' && isPluginNode ? (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PluginMenuAuth pluginId={pluginId!} />
           </div>
        ) : renderEditor()}
      </div>

      <div className="p-4 border-t border-border bg-accent/10 flex justify-end gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-full text-xs font-bold px-4"
        >
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onClose}
          className="rounded-full text-xs font-bold px-6 h-8"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};
