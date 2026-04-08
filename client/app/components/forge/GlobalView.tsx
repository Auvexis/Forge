import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { ExplorerView } from "~/components/views/ExplorerView";
import { WorkspacesView } from "~/components/views/WorkspacesView";
import { ForgeSidebar } from "./ForgeSidebar";

export const GlobalViewProvider = () => {
  const { view } = useForge();

  return (
    <div className="w-full h-full flex justify-center items-center">
      <ForgeSidebar/>


      {view === GlobalViews.EXPLORER && <ExplorerView />}
      {view === GlobalViews.WORKSPACES && <WorkspacesView />}
    </div>
  );
};
