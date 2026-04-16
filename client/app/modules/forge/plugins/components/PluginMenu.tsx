import { ShieldCheck, Command, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { useForge } from "~/providers/ForgeProvider";
import { PluginMenuAuth } from "./PluginMenuAuth";
import { PluginMenuMethods } from "./PluginMenuMethods";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const PluginMenu = ({
  pluginId,
  onClose,
}: {
  pluginId: string;
  onClose: () => void;
}) => {
  type Tab = "methods" | "auth";

  const {
    activePlugin: plugin,
    fetchActivePluginData,
    activePluginLoading: loading,
  } = useForge();
  const [tab, setTab] = useState<Tab>("methods");

  useEffect(() => {
    fetchActivePluginData(pluginId);
  }, [pluginId, fetchActivePluginData]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="min-w-[60rem]! max-w-[60rem]! min-h-[40rem]! max-h-[40rem]! bg-card! border border-border rounded-md! p-0 overflow-hidden flex flex-col shadow-lg"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading plugin...</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                {/* Plugin icon */}
                <div className="w-12 h-12 bg-accent border border-border rounded-lg flex items-center justify-center shrink-0 p-2">
                  <img
                    className="w-full h-full object-contain"
                    src={plugin?.manifest.metadata.icon}
                    alt=""
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {plugin?.manifest.metadata.name}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-lg leading-snug">
                    {plugin?.manifest.metadata.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-accent border border-border px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">
                      {pluginId}
                    </span>
                    <span className="bg-accent border border-border px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">
                      v{plugin?.manifest.metadata.version}
                    </span>
                  </div>
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

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["methods", "auth"] as Tab[]).map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-none flex items-center border-0! border-b-2! justify-center gap-2 px-5 py-2.5 text-sm font-medium h-auto shadow-none hover:bg-transparent",
                    tab === t
                      ? "border-nod8-node-editor-panel-tab-border-active text-nod8-node-editor-panel-tab-text-active"
                      : "border-transparent text-nod8-node-editor-panel-tab-text hover:text-nod8-node-editor-panel-tab-text-active",
                  )}
                >
                  {t === "methods" ? (
                    <Command className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  {t === "methods" ? "Methods" : "Authorization"}
                </Button>
              ))}
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-3.5 py-0">
              {tab === "auth" && <PluginMenuAuth pluginId={pluginId} />}
              {tab === "methods" && <PluginMenuMethods pluginId={pluginId} />}
            </main>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
