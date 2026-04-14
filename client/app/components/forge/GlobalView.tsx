import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { ExplorerView } from "~/components/views/ExplorerView";
import { ForgeSidebar } from "./ForgeSidebar";
import { WorkflowsView } from "../views/WorkspacesView";
import { WorkflowsSubSidebar } from "./ForgeSubSidebar";

export const GlobalViewProvider = () => {
  const { view } = useForge();

  return (
    <div className="w-full h-full flex justify-center items-center">
      <ForgeSidebar />
      <WorkflowsSubSidebar />

      {view === GlobalViews.EXPLORER && <ExplorerView />}
      {view === GlobalViews.WORKFLOWS && <WorkflowsView />}
    </div>
  );
};
