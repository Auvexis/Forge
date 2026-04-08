import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { ExplorerView } from "./views/ExplorerView";
import { ForgeSidebar } from "./forge/ForgeSidebar";

export const GlobalViewProvider = () => {
  const { view } = useForge();

  return (
    <div className="w-full h-full flex justify-center items-center">
      <ForgeSidebar/>

      {view === GlobalViews.EXPLORER && <ExplorerView />}
    </div>
  );
};
