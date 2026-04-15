import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { ExplorerView } from "~/components/views/ExplorerView";
import { ForgeSidebar } from "./ForgeSidebar";
import { WorkflowsView } from "../views/WorkflowsView";

export const GlobalViewProvider = () => {
  const { view } = useForge();
  const isExplorer = view === GlobalViews.EXPLORER;
  const isWorkflows = view === GlobalViews.WORKFLOWS;

  return (
    <div className="w-full h-full flex">
      <ForgeSidebar />

      <div className="flex-1 h-full overflow-hidden">
        {/* Keep both views mounted to avoid expensive remount/fetch delay when toggling tabs */}
        <div
          className={isExplorer ? "h-full" : "hidden h-full"}
          aria-hidden={!isExplorer}
        >
          <ExplorerView />
        </div>
        <div
          className={isWorkflows ? "h-full" : "hidden h-full"}
          aria-hidden={!isWorkflows}
        >
          <WorkflowsView />
        </div>
      </div>
    </div>
  );
};
