import { Handle, Position } from "@xyflow/react";
import { Button } from "~/components/ui/button";
import { PluginMenu } from "../components/PluginMenu";
import { useState } from "react";

export const PluginNode = ({ data }: any) => {
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);

  return (
    <>
      <div className="relative group animate-in zoom-in-95 duration-500">
        <Handle
          type="source"
          position={Position.Top}
          className="opacity-0! pointer-events-none!"
        />
        <Handle
          type="target"
          position={Position.Top}
          className="opacity-0! pointer-events-none!"
        />

        <div className="relative">
          {/* Active Glow Effect */}
          <div className="absolute -inset-2 bg-primary/7 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>

          <button
            onClick={() => setPluginMenuOpen(true)}
            style={{ backfaceVisibility: "hidden" }}
            className={`
              relative w-12 h-12
              bg-sidebar/40 backdrop-blur-2xl 
              rounded-[1rem] border border-sidebar-accent/40
              flex items-center justify-center p-2
              shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]
              hover:border-primary/20 hover:scale-105
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
              transform-gpu antialiased
            `}
          >
            <img
              src={data.icon}
              alt={data.label}
              className="w-full h-full object-contain"
            />
          </button>

          {/* Label Tooltip (Optional, but helps UX) */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 -translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="px-1.5 py-1 flex justify-center items-center bg-sidebar border border-sidebar-accent/50 rounded-full whitespace-nowrap">
              <span className="text-[0.45rem] font-semibold text-foreground">
                {data.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {pluginMenuOpen && (
        <PluginMenu
          pluginId={data.id}
          onClose={() => setPluginMenuOpen(false)}
        />
      )}
    </>
  );
};

export const nodeTypes = { plugin: PluginNode };
