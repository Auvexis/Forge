import { KeyRound, Play, Loader2 } from "lucide-react";
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

  const tabs = [
    {
      icon: <Play />,
      value: PluginMenuView.METHODS,
      label: "Methods",
    },
    {
      icon: <KeyRound />,
      value: PluginMenuView.AUTH,
      label: "Auth",
    },
  ];

  const { activePlugin: plugin, fetchActivePluginData, activePluginLoading: loading } = useForge();
  const [view, setView] = useState<PluginMenuView>(PluginMenuView.METHODS);

  useEffect(() => {
    fetchActivePluginData(pluginId);
  }, [pluginId, fetchActivePluginData]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="flex flex-col">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader className="flex flex-row h-10 max-h-10 min-h-10 justify-start items-center">
              <DialogTitle className="w-6 h-6">
                <img
                  className="w-full h-full object-contain"
                  src={plugin?.manifest.metadata.icon}
                  alt=""
                />
              </DialogTitle>

              <Tabs
                defaultValue={PluginMenuView.METHODS}
                className="ml-auto mr-auto"
              >
                <TabsList className="space-x-2">
                  {tabs.map((tab) => {
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        onClick={() => setView(tab.value)}
                      >
                        {tab.icon}
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </DialogHeader>

            {view === PluginMenuView.AUTH && <PluginMenuAuth pluginId={pluginId} />}
            {view === PluginMenuView.METHODS && (
              <PluginMenuMethods pluginId={pluginId} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
