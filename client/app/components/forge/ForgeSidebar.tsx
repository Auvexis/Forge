import { Workflow, Anvil, Compass, LayoutGrid, Settings } from "lucide-react";
import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { Button } from "~/components/ui/button";

export const ForgeSidebar = () => {
  const { view, setView, activeSubSidebar, setActiveSubSidebar } = useForge();

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50 h-fit pointer-events-none group/dock">
      {/* Tactical Ether Glow (Neutral) */}
      <div className="absolute -inset-10 bg-white/5 blur-[30px] rounded-full opacity-40 group-hover/dock:opacity-60 transition-opacity duration-1000" />
      <div className="absolute inset-4 bg-white/10 blur-[20px] rounded-full opacity-20 pointer-events-none" />

      <div className="flex flex-col items-center gap-1.5 p-1.5 bg-sidebar/65 backdrop-blur-3xl border border-sidebar-accent/60 rounded-[2.5rem] shadow-[20px_0_60px_-15px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-left-10 duration-1000 pointer-events-auto relative z-10 antialiased">
        {/* Section 1: Branding Capsule */}
        <div className="flex flex-col items-center gap-1 pb-2 border-b border-sidebar-accent/20 w-11 mt-1">
          <div className="w-10 h-10 rounded-2xl bg-foreground/5 flex items-center justify-center border border-foreground/10 shadow-inner group/logo cursor-pointer transition-all active:scale-95">
            <Anvil className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors" />
          </div>
        </div>

        {/* Section 2: Tactical Navigation */}
        <div className="flex flex-col items-center gap-1.5 py-1 border-b border-sidebar-accent/20 w-11">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(GlobalViews.EXPLORER)}
            className={`w-10 h-10 rounded-2xl transition-all relative group ${
              view === GlobalViews.EXPLORER
                ? "bg-foreground/10 text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <Compass
              className={`w-5 h-5`}
            />

            {/* Micro Tooltip */}
            <div className="absolute left-[120%] bg-sidebar border border-sidebar-accent/40 px-2 py-1.5 rounded-xl text-micro font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-xl">
              Explorer
            </div>

            {/* Connection Port */}
            {view === GlobalViews.EXPLORER && (
              <div className="absolute -left-1.5 w-1 h-4 bg-foreground rounded-full animate-in fade-in zoom-in duration-300" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(GlobalViews.WORKFLOWS)}
            className={`w-10 h-10 rounded-2xl transition-all relative group ${
              view === GlobalViews.WORKFLOWS
                ? "bg-foreground/10 text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            }`}
            onMouseEnter={() => setActiveSubSidebar("workflows")}
            onMouseLeave={() => setActiveSubSidebar(null)}
          >
            <Workflow
              className={`w-5 h-5`}
            />

            <div className="absolute left-[120%] bg-sidebar border border-sidebar-accent/40 px-2 py-1.5 rounded-xl text-micro font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-xl">
              Workflows
            </div>

            {view === GlobalViews.WORKFLOWS && (
              <div className="absolute -left-1.5 w-1 h-4 bg-foreground rounded-full animate-in fade-in zoom-in duration-300" />
            )}

            {/* Submenu Indicator Arrow */}
            {(view === GlobalViews.WORKFLOWS || activeSubSidebar === "workflows") && (
              <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sidebar-accent/80 border-t border-r border-sidebar-accent border-r-foreground/20 border-t-foreground/20 rotate-45 animate-in fade-in slide-in-from-left-2 duration-500" />
            )}
          </Button>
        </div>

        {/* Section 3: System Utilities */}
        <div className="flex flex-col items-center gap-1.5 pt-1 w-11 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-2xl text-muted-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all group relative"
          >
            <Settings className="w-5 h-5" />
            <div className="absolute left-[120%] bg-sidebar border border-sidebar-accent/40 px-2 py-1.5 rounded-xl text-micro font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none shadow-xl">
              Settings
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};
