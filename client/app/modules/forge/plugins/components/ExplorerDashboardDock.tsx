import {
  Search,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Terminal,
  Sparkles,
  Settings2,
  Plus,
  Loader2,
  Network,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[50]">
      <div className="flex items-center gap-1.5 p-1.5 bg-sidebar/85 backdrop-blur-3xl border border-sidebar-accent/30 rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-1000 fill-mode-forwards antialiased">
        {/* Section 1: Compass & Status */}
        <div className="flex items-center gap-3 pl-4 pr-3 border-r border-sidebar-accent/20 h-10 group/brand cursor-default">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover/brand:border-blue-500/40 transition-colors">
            <Compass className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[12px] font-black text-foreground tracking-wide leading-none mb-0.5">
              EXPLORER
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shadow-[0_0_5px_#3b82f6]" />
              <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider leading-none opacity-40">
                {nodeCount} Plugins Loaded
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Navigation Tools */}
        <div className="flex items-center gap-1 px-2 border-r border-sidebar-accent/20 h-10">
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
        </div>

        {/* Section 3: Universal Search */}
        <div className="flex items-center px-2 border-r border-sidebar-accent/20 h-10">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-blue-500 transition-colors" />
            <input
              placeholder="Find entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 w-[140px] bg-sidebar-accent/5 hover:bg-sidebar-accent/10 border-transparent focus:outline-none focus:border-sidebar-accent/20 rounded-full font-bold text-[10px] transition-all placeholder:text-muted-foreground/20 uppercase tracking-tight text-foreground"
            />
          </div>
        </div>

        {/* Section 4: Network Systems */}
        <div className="flex items-center gap-1 px-2 border-sidebar-accent/20 h-10">
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
        </div>
      </div>
    </div>
  );
};
