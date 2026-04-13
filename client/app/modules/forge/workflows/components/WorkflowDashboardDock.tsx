import { Search, Workflow, LayoutGrid, Layers, SlidersHorizontal, Share2, Sparkles, Settings2, Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[50]">
      <div className="flex items-center gap-1.5 p-1.5 bg-sidebar/85 backdrop-blur-3xl border border-sidebar-accent/30 rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-1000 fill-mode-forwards antialiased">
        
        {/* Section 1: Brand & Status */}
        <div className="flex items-center gap-3 pl-4 pr-3 border-r border-sidebar-accent/20 h-10 group/brand cursor-default">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] group-hover/brand:border-rose-500/40 transition-colors">
            <Workflow className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[12px] font-black text-foreground tracking-wide leading-none mb-0.5">
              WORKFLOWS
            </h1>
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse shadow-[0_0_5px_#f43f5e]" />
               <span className="text-micro text-muted-foreground uppercase font-semibold tracking-wider leading-none opacity-40">
                 {moduleCount} Modules Active
               </span>
            </div>
          </div>
        </div>

        {/* Section 2: View Controls */}
        <div className="flex items-center gap-1 px-2 border-r border-sidebar-accent/20 h-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setViewMode("list")}
            className={`h-8 w-8 rounded-full transition-all ${viewMode === 'list' ? 'bg-rose-500/10 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-muted-foreground hover:bg-sidebar-accent/20 hover:text-rose-500'}`}
          >
             <Layers className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setViewMode("grid")}
            className={`h-8 w-8 rounded-full transition-all ${viewMode === 'grid' ? 'bg-rose-500/10 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-muted-foreground hover:bg-sidebar-accent/20 hover:text-rose-500'}`}
          >
             <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-sidebar-accent/10 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-amber-500 transition-all">
             <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Section 3: Universal Search */}
        <div className="flex items-center px-2 border-r border-sidebar-accent/20 h-10">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-rose-500 transition-colors" />
            <input
              placeholder="Query modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 w-[140px] bg-sidebar-accent/5 hover:bg-sidebar-accent/10 border-transparent focus:outline-none focus:border-sidebar-accent/20 rounded-full font-bold text-mini transition-all placeholder:text-muted-foreground/20 uppercase tracking-tight text-foreground"
            />
          </div>
        </div>

        {/* Section 4: Advanced Tools */}
        <div className="flex items-center gap-1 px-2 border-r border-sidebar-accent/20 h-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onImport}
            className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-blue-500 transition-all group/tool relative"
          >
             <Share2 className="w-3.5 h-3.5" />
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-[8px] font-black uppercase opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none">Import</div>
          </Button>
          <Button variant="ghost" size="icon" className="group/ai h-8 w-8 rounded-full hover:bg-violet-500/10 text-muted-foreground hover:text-violet-500 transition-all relative">
             <Sparkles className="w-3.5 h-3.5" />
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full border-2 border-sidebar animate-ping" />
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sidebar border border-sidebar-accent/40 px-2 py-1 rounded text-[8px] font-black uppercase opacity-0 group-hover/ai:opacity-100 transition-opacity pointer-events-none">Synthesis</div>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-sidebar-accent/20 text-muted-foreground hover:text-foreground transition-all">
             <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Section 5: Main Action */}
        <div className="pl-2 pr-1">
          <Button
            onClick={onCreate}
            disabled={isCreating}
            className="h-9 px-5 rounded-full font-black uppercase text-micro tracking-[0.15em] gap-2 bg-rose-600 text-white hover:bg-rose-500 shadow-[0_5px_20px_rgba(244,63,94,0.15)] active:scale-95 transition-all"
          >
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            )}
            New Workflow
          </Button>
        </div>
      </div>
    </div>
  );
};
