import {
  Search,
  Workflow,
  LayoutGrid,
  Layers,
  SlidersHorizontal,
  Share2,
  Sparkles,
  Settings2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ForgeDock, type DockSection } from "~/shared/components/ForgeDock";

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
            className={`h-8 w-8 rounded-full transition-all ${viewMode === "list" ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-emerald-500"}`}
          >
            <Layers className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={`h-8 w-8 rounded-full transition-all ${viewMode === "grid" ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-emerald-500"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-emerald-500 transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
        </>
      ),
    },
    {
      id: "search",
      content: (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-emerald-500 transition-colors" />
          <input
            placeholder="Find Workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 w-[140px] bg-sidebar-accent/5 hover:bg-sidebar-accent/10 border-transparent focus:outline-none focus:border-sidebar-accent/20 rounded-full font-bold text-mini transition-all placeholder:text-muted-foreground/20 uppercase tracking-tight text-foreground"
          />
        </div>
      ),
    },
    {
      id: "tools",
      content: (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onImport}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-blue-500 transition-all group/tool relative"
          >
            <Share2 className="w-3.5 h-3.5" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-nano font-black uppercase opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none">
              Import
            </div>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="group/ai h-8 w-8 rounded-full hover:bg-violet-500/10 text-muted-foreground hover:text-violet-500 transition-all relative"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full border-2 border-sidebar animate-ping" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-nano font-black uppercase opacity-0 group-hover/ai:opacity-100 transition-opacity pointer-events-none">
              Synthesis
            </div>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </>
      ),
    },
  ];

  const trailing = (
    <Button
      onClick={onCreate}
      disabled={isCreating}
      className="h-9 px-5 rounded-full font-black uppercase text-mini! tracking-[0.15em] gap-2 bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_5px_20px_rgba(16,185,129,0.15)] transition-all"
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
    <ForgeDock
      icon={Workflow}
      title="Workflows"
      subtitle={`${moduleCount} ${moduleCount === 1 ? "Workflow" : "Workflows"} Active`}
      accent="emerald"
      sections={sections}
      trailing={trailing}
    />
  );
};
