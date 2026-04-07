import { useGlobalView, GlobalViews } from "~/composables/useGlobalView";
import { ExplorerView } from "./views/ExplorerView";

export const GlobalViewProvider = () => {
  const { view } = useGlobalView();

  return (
    <div className="w-full h-full flex justify-center items-center">
      {view === GlobalViews.EXPLORER && <ExplorerView />}
    </div>
  );
};
