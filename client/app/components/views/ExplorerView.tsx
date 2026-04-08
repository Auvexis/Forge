import { PluginTree } from "~/modules/forge/plugins/renderers/PluginTree";

export const ExplorerView = () => {
  return (
    <div className="w-full h-full flex justify-center items-center animate-in fade-in duration-500">
      <PluginTree />
    </div>
  );
};
