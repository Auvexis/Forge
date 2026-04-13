import {
  Search,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  Sparkles,
  Settings2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ForgeDock, type DockSection } from "~/shared/components/ForgeDock";

interface Props {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  nodeCount: number;
}

export const ExplorerDashboardDock = ({
  searchQuery,
  setSearchQuery,
  onZoomIn,
  onZoomOut,
  onFitView,
  nodeCount,
}: Props) => {
  const sections: DockSection[] = [
    {
      id: "navigation",
      content: (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onFitView}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-emerald-500 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </>
      ),
    },
    {
      id: "search",
      content: (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-blue-500 transition-colors" />
          <input
            placeholder="Find entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 w-[140px] bg-sidebar-accent/5 hover:bg-sidebar-accent/10 border-transparent focus:outline-none focus:border-sidebar-accent/20 rounded-full font-bold text-mini transition-all placeholder:text-muted-foreground/20 uppercase tracking-tight text-foreground"
          />
        </div>
      ),
    },
    {
      id: "tools",
      border: false,
      content: (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-blue-500 transition-all group/tool relative"
          >
            <Network className="w-3.5 h-3.5" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-[8px] font-black uppercase opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none">
              Topology
            </div>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="group/ai h-8 w-8 rounded-full hover:bg-violet-500/10 text-muted-foreground hover:text-violet-500 transition-all relative"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full border-2 border-sidebar animate-ping" />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-[8px] font-black uppercase opacity-0 group-hover/ai:opacity-100 transition-opacity pointer-events-none">
              Auto-Layout
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

  return (
    <ForgeDock
      icon={Compass}
      title="Explorer"
      subtitle={`${nodeCount} Plugins Loaded`}
      accent="blue"
      sections={sections}
    />
  );
};
