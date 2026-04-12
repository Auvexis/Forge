import { useState } from "react";
import { useForge } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";
import {
  X,
  Search,
  ChevronLeft,
  Workflow,
  Blocks,
  Loader2,
  Code2,
  GitBranch,
  Repeat,
  Layers,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { LucideIconRenderer } from "../../../../../components/LucideIconRenderer";
import type { WorkflowNodeType } from "../../types/workflow-types";

// ──────────── Logic node definitions ────────────

interface LogicNodeDef {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: typeof Code2;
  color: string;
  bg: string;
}

const LOGIC_NODES: LogicNodeDef[] = [
  {
    type: "code",
    label: "Code Block",
    description: "Execute custom JavaScript in a sandboxed environment",
    icon: Code2,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    type: "if",
    label: "If / Else",
    description: "Branch the flow based on a condition",
    icon: GitBranch,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    type: "loop",
    label: "Loop / ForEach",
    description: "Iterate over a collection and run nodes per item",
    icon: Repeat,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    type: "subworkflow",
    label: "Sub-Workflow",
    description: "Call another workflow as a nested step",
    icon: Layers,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

// ──────────── Component ────────────

type ViewMode = "categories" | "plugins" | "actions";

interface Props {
  onAddNode: (pluginId: string, action: string, actionName: string) => void;
  onAddLogicNode: (type: WorkflowNodeType) => void;
  onClose: () => void;
}

export const AddNodeOverlay = ({
  onAddNode,
  onAddLogicNode,
  onClose,
}: Props) => {
  const { plugins, pluginsLoading } = useForge();
  const [view, setView] = useState<ViewMode>("categories");
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selectedPlugin = plugins.find((p) => p.id === selectedPluginId);

  const goBack = () => {
    if (view === "actions") {
      setView("plugins");
      setSelectedPluginId(null);
      setSearch("");
    } else if (view === "plugins") {
      setView("categories");
      setSearch("");
    }
  };

  const selectPlugin = (id: string) => {
    setSelectedPluginId(id);
    setView("actions");
    setSearch("");
  };

  const searchPlaceholder = (() => {
    switch (view) {
      case "categories":
        return "Search components...";
      case "plugins":
        return "Search integrations...";
      case "actions":
        return "Search actions...";
    }
  })();

  return (
    <div className="absolute top-20 right-4 w-[400px] z-[60] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300 max-h-[calc(100%-110px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20 shrink-0">
        <div className="flex items-center gap-1">
          {view !== "categories" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full mr-1 hover:bg-background/50"
              onClick={goBack}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex flex-col">
            <h3 className="font-black text-[9px] uppercase tracking-widest text-foreground/50">
              Add component
            </h3>
            <span className="text-sm font-bold truncate max-w-[280px]">
              {view === "actions" && selectedPlugin
                ? selectedPlugin.manifest.metadata.name
                : view === "plugins"
                  ? "Integrations"
                  : "Component Type"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border bg-accent/5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9 h-9 bg-background/50 border-border/50 text-xs font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {pluginsLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
              Syncing Forge...
            </p>
          </div>
        ) : view === "categories" ? (
          // ─── Category View: Logic + Integrations ───
          <div className="flex flex-col gap-4">
            {/* Logic Nodes Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1 mb-1">
                <div className="w-1 h-3.5 bg-violet-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Logic & Control
                </span>
              </div>
              {LOGIC_NODES.filter((n) =>
                n.label.toLowerCase().includes(search.toLowerCase()),
              ).map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    className="flex items-center gap-3 p-3 text-left hover:bg-accent/40 rounded-xl transition-all border border-transparent hover:border-border/50 group"
                    onClick={() => {
                      onAddLogicNode(def.type);
                    }}
                  >
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border border-border group-hover:scale-105 transition-transform overflow-hidden shrink-0 ${def.bg}`}
                    >
                      <Icon className={`w-5 h-5 ${def.color}`} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold text-xs truncate uppercase tracking-tight">
                        {def.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                        {def.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Integrations Section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1 mb-1">
                <div className="w-1 h-3.5 bg-primary rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Integrations
                </span>
              </div>
              {plugins
                .filter((p) =>
                  p.manifest.metadata.name
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center gap-3 p-3 text-left hover:bg-accent/40 rounded-xl transition-all border border-transparent hover:border-border/50 group"
                    onClick={() => selectPlugin(p.id)}
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                      <LucideIconRenderer
                        name={p.manifest.metadata.icon || "box"}
                        className="text-primary"
                        size={20}
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold text-xs truncate uppercase tracking-tight">
                        {p.manifest.metadata.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                        {p.manifest.metadata.description}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : view === "plugins" ? (
          // ─── Plugin List (fallback if navigated directly) ───
          <div className="flex flex-col gap-1.5">
            {plugins
              .filter((p) =>
                p.manifest.metadata.name
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  className="flex items-center gap-3 p-3 text-left hover:bg-accent/40 rounded-xl transition-all border border-transparent hover:border-border/50 group"
                  onClick={() => selectPlugin(p.id)}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                    <LucideIconRenderer
                      name={p.manifest.metadata.icon || "box"}
                      className="text-primary"
                      size={20}
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-xs truncate uppercase tracking-tight">
                      {p.manifest.metadata.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                      {p.manifest.metadata.description}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        ) : (
          // ─── Actions List for Selected Plugin ───
          <div className="flex flex-col gap-1.5">
            {Object.entries(selectedPlugin?.manifest.methods || {})
              .filter(([methodKey, methodVal]) =>
                (methodVal.metadata.label || methodKey)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map(([methodKey, methodVal]) => (
                <button
                  key={methodKey}
                  className="flex items-center gap-3 p-3 text-left hover:bg-primary/5 rounded-xl transition-all border border-transparent hover:border-primary/20 group"
                  onClick={() =>
                    onAddNode(
                      selectedPluginId!,
                      methodKey,
                      methodVal.metadata.label || methodKey,
                    )
                  }
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors shrink-0">
                    <Workflow className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-xs uppercase tracking-tight">
                      {methodVal.metadata.label || methodKey}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
                      {methodVal.metadata.description}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        )}

        {!pluginsLoading && view === "categories" && plugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Blocks className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              No modules found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
