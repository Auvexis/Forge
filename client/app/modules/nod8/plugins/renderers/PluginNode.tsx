import { Handle, Position } from "@xyflow/react";
import { PluginMenu } from "../components/PluginMenu";
import { useState } from "react";
import { Button } from "~/components/ui/button";

export const PluginNode = ({ data }: any) => {
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);

  return (
    <>
      <div className="relative group">
        <Handle
          type="source"
          position={Position.Top}
          className="hidden!"
          style={{ top: -10, width: 14, height: 14 }}
        />
        <Handle
          type="target"
          position={Position.Top}
          className="hidden!"
          style={{ top: -10, width: 14, height: 14 }}
        />

        <Button
          variant="ghost"
          onClick={() => setPluginMenuOpen(true)}
          title={data.label}
          className="relative h-11 w-11 shrink-0 rounded-lg border border-border/40 bg-card p-2 shadow-none hover:border-border hover:bg-accent transition-colors"
        >
          <img
            src={data.icon}
            alt={data.label}
            className="w-full h-full object-contain"
          />
        </Button>

        {/* Label */}
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="px-1.5 py-1 bg-popover border border-border rounded-md text-[0.6rem] flex justify-center items-center text-foreground whitespace-nowrap">
            {data.label}
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
