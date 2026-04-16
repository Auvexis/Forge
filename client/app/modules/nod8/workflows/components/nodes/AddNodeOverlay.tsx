import { useState } from "react";
import { useNod8 } from "~/providers/Nod8Provider";
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
  Globe,
  Zap,
  Target,
} from "lucide-react";
import { LucideIconRenderer } from "../../../../../components/LucideIconRenderer";
import type { WorkflowNodeType } from "../../types/workflow-types";

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
    description: "Execute custom JavaScript in a sandbox",
    icon: Code2,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    type: "if",
    label: "If / Else",
    description: "Branch the flow based on a condition",
    icon: GitBranch,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    type: "loop",
    label: "Loop / ForEach",
    description: "Iterate over a collection per item",
    icon: Repeat,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    type: "subworkflow",
    label: "Sub-Workflow",
    description: "Call another workflow as a nested step",
    icon: Layers,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    type: "http",
    label: "HTTP Request",
    description: "Make an HTTP request to any external API",
    icon: Globe,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    type: "event",
    label: "Emit Event",
    description: "Publish an event to trigger other flows",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    type: "event-listener",
    label: "Event Listener",
    description: "Wait for an event to trigger a sub-flow",
    icon: Target,
    color: "text-ping-400 text-pink-400",
    bg: "bg-pink-500/10",
  },
];

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
  const { plugins, pluginsLoading } = useNod8();
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

  const searchPlaceholder =
    view === "categories"
      ? "Search components..."
      : view === "plugins"
        ? "Search integrations..."
        : "Search actions...";

  return (
    <>
      <div className="fixed inset-0 z-[50]" onClick={onClose} />
      <div
        className="absolute top-0 right-0 w-[360px] h-full z-[60] bg-nod8-add-node-overlay-bg border-l border-nod8-add-node-overlay-border flex flex-col overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-nod8-add-node-overlay-header-border shrink-0">
        <div className="flex items-center gap-2">
          {view !== "categories" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={goBack}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {view === "actions" && selectedPlugin
                ? selectedPlugin.manifest.metadata.name
                : view === "plugins"
                  ? "Integrations"
                  : "Add Node"}
            </span>
            {view === "actions" && selectedPlugin && (
              <span className="text-xs text-nod8-add-node-overlay-muted-text">
                Select an action
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-nod8-add-node-overlay-header-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nod8-add-node-overlay-search-icon" />
          <input
            placeholder={searchPlaceholder}
            className="w-full bg-nod8-add-node-overlay-input-bg border border-nod8-add-node-overlay-input-border rounded-md pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {pluginsLoading ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-nod8-add-node-overlay-empty-text">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Loading plugins...</span>
          </div>
        ) : view === "categories" ? (
          <div className="flex flex-col gap-4">
            {/* Logic nodes */}
            <div>
              <p className="text-xs font-medium text-nod8-add-node-overlay-section-label uppercase tracking-wide px-1 mb-1.5">
                Logic &amp; Control
              </p>
              <div className="flex flex-col gap-0.5">
                {LOGIC_NODES.filter((n) =>
                  n.label.toLowerCase().includes(search.toLowerCase()),
                ).map((def) => {
                  const Icon = def.icon;
                  return (
                    <Button
                      key={def.type}
                      variant="ghost"
                      className="flex h-auto w-full items-center justify-start gap-3 px-2 py-2 text-left font-normal hover:bg-nod8-add-node-overlay-item-hover-bg rounded-md transition-colors"
                      onClick={() => onAddLogicNode(def.type)}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-md border border-nod8-add-node-overlay-item-icon-well-border shrink-0 ${def.bg}`}
                      >
                        <Icon className={`w-4 h-4 ${def.color}`} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium">{def.label}</span>
                        <span className="text-xs text-nod8-add-node-overlay-item-description-text truncate">
                          {def.description}
                        </span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Integrations */}
            <div>
              <p className="text-xs font-medium text-nod8-add-node-overlay-section-label uppercase tracking-wide px-1 mb-1.5">
                Integrations
              </p>
              <div className="flex flex-col gap-0.5">
                {plugins
                  .filter((p) =>
                    p.manifest.metadata.name
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <Button
                      key={p.id}
                      variant="ghost"
                      className="flex h-auto w-full items-center justify-start gap-3 px-2 py-2 text-left font-normal hover:bg-nod8-add-node-overlay-item-hover-bg rounded-md transition-colors"
                      onClick={() => selectPlugin(p.id)}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-md border border-nod8-add-node-overlay-item-icon-well-border bg-nod8-add-node-overlay-item-icon-well-bg shrink-0">
                        <LucideIconRenderer
                          name={p.manifest.metadata.icon || "box"}
                          className="text-nod8-add-node-overlay-item-description-text"
                          size={16}
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {p.manifest.metadata.name}
                        </span>
                        <span className="text-xs text-nod8-add-node-overlay-item-description-text truncate">
                          {p.manifest.metadata.description}
                        </span>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        ) : view === "plugins" ? (
          <div className="flex flex-col gap-0.5">
            {plugins
              .filter((p) =>
                p.manifest.metadata.name
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-start gap-3 px-2 py-2 text-left font-normal hover:bg-nod8-add-node-overlay-item-hover-bg rounded-md transition-colors"
                  onClick={() => selectPlugin(p.id)}
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-md border border-nod8-add-node-overlay-item-icon-well-border bg-nod8-add-node-overlay-item-icon-well-bg shrink-0">
                    <LucideIconRenderer
                      name={p.manifest.metadata.icon || "box"}
                      className="text-nod8-add-node-overlay-item-description-text"
                      size={16}
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium">
                      {p.manifest.metadata.name}
                    </span>
                    <span className="text-xs text-nod8-add-node-overlay-item-description-text truncate">
                      {p.manifest.metadata.description}
                    </span>
                  </div>
                </Button>
              ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {Object.entries(selectedPlugin?.manifest.methods || {})
              .filter(([methodKey, methodVal]) =>
                (methodVal.metadata.label || methodKey)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map(([methodKey, methodVal]) => (
                <Button
                  key={methodKey}
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-start gap-3 px-2 py-2 text-left font-normal hover:bg-nod8-add-node-overlay-item-hover-bg rounded-md transition-colors"
                  onClick={() =>
                    onAddNode(
                      selectedPluginId!,
                      methodKey,
                      methodVal.metadata.label || methodKey,
                    )
                  }
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-md border border-nod8-add-node-overlay-item-icon-well-border bg-nod8-add-node-overlay-item-icon-well-bg shrink-0">
                    <Workflow className="w-4 h-4 text-nod8-add-node-overlay-item-description-text" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">
                      {methodVal.metadata.label || methodKey}
                    </span>
                    <span className="text-xs text-nod8-add-node-overlay-item-description-text truncate">
                      {methodVal.metadata.description}
                    </span>
                  </div>
                </Button>
              ))}
          </div>
        )}

        {!pluginsLoading && view === "categories" && plugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-nod8-add-node-overlay-empty-text">
            <Blocks className="w-8 h-8 opacity-20" />
            <p className="text-sm">No plugins installed.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
