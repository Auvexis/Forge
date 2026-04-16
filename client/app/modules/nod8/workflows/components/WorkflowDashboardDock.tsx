import {
  Search,
  Workflow,
  LayoutGrid,
  Layers,
  Share2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Nod8Dock, type DockSection } from "~/shared/components/Nod8Dock";

interface Props {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  onImport: () => void;
  onCreate: () => void;
  moduleCount: number;
  isCreating: boolean;
}

export const WorkflowDashboardDock = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onImport,
  onCreate,
  moduleCount,
  isCreating,
}: Props) => {
  const sections: DockSection[] = [
    {
      id: "view",
      content: (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            title="List view"
            className={`h-7 w-7 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            title="Grid view"
            className={`h-7 w-7 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
        </>
      ),
    },
    {
      id: "search",
      content: (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 w-[160px] bg-accent border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>
      ),
    },
    {
      id: "tools",
      border: false,
      content: (
        <Button
          variant="ghost"
          size="icon"
          onClick={onImport}
          title="Import workflow"
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  const trailing = (
    <Button
      onClick={onCreate}
      disabled={isCreating}
      size="sm"
      className="h-7 px-3 text-xs font-medium gap-1.5 rounded-md"
    >
      {isCreating ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Plus className="w-3 h-3" />
      )}
      New Workflow
    </Button>
  );

  return (
    <Nod8Dock
      icon={Workflow}
      title="Workflows"
      subtitle={`${moduleCount} ${moduleCount === 1 ? "workflow" : "workflows"}`}
      accent="primary"
      variant="workflows"
      statusDot={{ color: "bg-nod8-dock-status-dot-primary", animate: false }}
      sections={sections}
      trailing={trailing}
    />
  );
};
