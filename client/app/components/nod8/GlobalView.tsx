import { useNod8, GlobalViews } from "~/providers/Nod8Provider";
import { ExplorerView } from "~/components/views/ExplorerView";
import { Nod8Sidebar } from "./Nod8Sidebar";
import { Nod8ColorsHeader } from "./Nod8ColorsHeader";
import { WorkflowsView } from "../views/WorkflowsView";

export const GlobalViewProvider = () => {
  const { view } = useNod8();
  const isExplorer = view === GlobalViews.EXPLORER;
  const isWorkflows = view === GlobalViews.WORKFLOWS;

  return (
    <div className="w-full h-full flex flex-col">
      <Nod8ColorsHeader />

      <div className="w-full h-full flex">
        <Nod8Sidebar />

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
    </div>
  );
};
