import { useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useNod8 } from "~/providers/Nod8Provider";
import { PluginTree } from "~/modules/nod8/plugins/renderers/PluginTree";
import { ExplorerDashboardDock } from "../../modules/nod8/plugins/components/ExplorerDashboardDock";

const ExplorerContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { plugins } = useNod8();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <ExplorerDashboardDock
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView()}
        nodeCount={plugins.length}
      />
      <div className="flex-1 w-full overflow-hidden">
        <PluginTree searchQuery={searchQuery} />
      </div>
    </div>
  );
};

export const ExplorerView = () => {
  return (
    <ReactFlowProvider>
      <ExplorerContent />
    </ReactFlowProvider>
  );
};
