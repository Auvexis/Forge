import { Handle, Position } from "@xyflow/react";
import { Button } from "~/components/ui/button";
import { PluginMenu } from "../components/PluginMenu";
import { useState } from "react";

export const PluginNode = ({ data }: any) => {
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <Handle
          type="source"
          position={Position.Top}
          style={{ opacity: 0, pointerEvents: "none" }}
        />
        <Handle
          type="target"
          position={Position.Top}
          style={{ opacity: 0, pointerEvents: "none" }}
        />

        <Button
          variant="outline"
          className="w-10 h-10 rounded-[5px]! bg-card! hover:opacity-80 flex items-center justify-center p-1"
          onClick={() => setPluginMenuOpen(true)}
        >
          <img
            src={data.icon}
            alt={data.label}
            className="w-full h-full object-contain"
          />
        </Button>
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
