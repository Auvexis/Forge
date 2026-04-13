import { KeyRound, Play, Loader2, X, Cog, ShieldCheck, Command } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useForge } from "~/providers/ForgeProvider";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PluginMenuAuth } from "./PluginMenuAuth";
import { PluginMenuMethods } from "./PluginMenuMethods";
import { Button } from "~/components/ui/button";

export const PluginMenu = ({
  pluginId,
  onClose,
}: {
  pluginId: string;
  onClose: () => void;
}) => {
  enum PluginMenuView {
    METHODS = "methods",
    AUTH = "auth",
  }

  const {
    activePlugin: plugin,
    fetchActivePluginData,
    activePluginLoading: loading,
  } = useForge();
  const [view, setView] = useState<PluginMenuView>(PluginMenuView.METHODS);

  useEffect(() => {
    fetchActivePluginData(pluginId);
  }, [pluginId, fetchActivePluginData]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        style={{ backfaceVisibility: "hidden" }}
        className="max-w-[55vw]! w-[55vw]! min-h-[80vh]! h-[80vh]! bg-sidebar/65 backdrop-blur-2xl p-0! rounded-[2.5rem]! border border-sidebar-accent/30 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transform-gpu will-change-transform antialiased"
      >
        {loading ? (
          <div className="flex h-80 flex-col items-center justify-center gap-6">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-80" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-mini font-black uppercase tracking-[0.2em] text-primary/60">
                Synchronizing Runtime
              </span>
              <span className="text-micro text-muted-foreground/40 font-bold uppercase tracking-widest mt-1">
                Initializing Secure Connection...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="relative p-4 pb-6 border-b border-sidebar-accent/20 bg-gradient-to-b from-sidebar-accent/10 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-primary/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative w-20 h-20 bg-sidebar-accent/20 backdrop-blur-xl rounded-[1.5rem] p-3.5 flex items-center justify-center border border-sidebar-accent/30 shadow-2xl group-hover:border-primary/30 transition-all">
                      <img
                        className="w-full h-full object-contain drop-shadow-lg"
                        src={plugin?.manifest.metadata.icon}
                        alt=""
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black tracking-tighter text-foreground">
                          {plugin?.manifest.metadata.name}
                        </h2>
                      </div>
                      <p className="text-small text-muted-foreground font-medium mt-1.5 opacity-80 leading-relaxed max-w-md">
                        {plugin?.manifest.metadata.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-accent/50">
                        <span className="text-micro font-black text-muted-foreground uppercase tracking-widest opacity-60">
                          ID
                        </span>
                        <span className="text-mini font-mono font-bold text-primary/80">
                          {pluginId.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-accent/50">
                        <span className="text-micro font-black text-muted-foreground uppercase tracking-widest opacity-60">
                          Ver
                        </span>
                        <span className="text-mini font-mono font-bold text-muted-foreground">
                          {plugin?.manifest.metadata.version}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-2xl bg-sidebar-accent/20 hover:bg-destructive/10 hover:text-destructive transition-all border border-sidebar-accent/30"
                  onClick={onClose}
                >
                  <X size={20} />
                </Button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-8 mt-10">
                <button
                  onClick={() => setView(PluginMenuView.METHODS)}
                  className={`relative flex items-center gap-2.5 px-1 py-3 group transition-all`}
                >
                  <div
                    className={`p-2 rounded-xl transition-all ${view === PluginMenuView.METHODS ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-sidebar-accent/20 text-muted-foreground group-hover:bg-sidebar-accent/40"}`}
                  >
                    <Command size={16} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span
                      className={`text-mini font-black uppercase tracking-widest leading-none ${view === PluginMenuView.METHODS ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Methods
                    </span>
                    <span className="text-micro font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
                      System Logic
                    </span>
                  </div>
                  {view === PluginMenuView.METHODS && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  )}
                </button>

                <button
                  onClick={() => setView(PluginMenuView.AUTH)}
                  className={`relative flex items-center gap-2.5 px-1 py-3 group transition-all`}
                >
                  <div
                    className={`p-2 rounded-xl transition-all ${view === PluginMenuView.AUTH ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-sidebar-accent/20 text-muted-foreground group-hover:bg-sidebar-accent/40"}`}
                  >
                    <ShieldCheck size={16} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span
                      className={`text-mini font-black uppercase tracking-widest leading-none ${view === PluginMenuView.AUTH ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Authorization
                    </span>
                    <span className="text-micro font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
                      Secure Access
                    </span>
                  </div>
                  {view === PluginMenuView.AUTH && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  )}
                </button>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-2 py-px custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(var(--sidebar-accent),0.1)_0%,transparent_100%)]">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {view === PluginMenuView.AUTH && (
                  <PluginMenuAuth pluginId={pluginId} />
                )}
                {view === PluginMenuView.METHODS && (
                  <PluginMenuMethods pluginId={pluginId} />
                )}
              </div>
            </main>

            <footer className="px-8 py-5 border-t border-sidebar-accent/20 bg-sidebar/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-mini font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">
                  Runtime Synchronized
                </span>
              </div>
              <p className="text-tiny font-mono font-bold text-muted-foreground/30 uppercase">
                Forge.Node.Engine::v1.0.4-LTS
              </p>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
