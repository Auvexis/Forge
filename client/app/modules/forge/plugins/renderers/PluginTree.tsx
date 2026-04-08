import { useEffect, useMemo, useState, useCallback } from "react";
import { useForge } from "~/providers/ForgeProvider";
import { buildGraph } from "../utils/buildGraph";
import { applyLayout } from "../utils/applyGraphLayout";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
} from "@xyflow/react";
import { nodeTypes } from "./PluginNode";
import { FloatingEdge } from "./FloatingEdge";

export const PluginTree = () => {
  const { plugins, getPlugins } = useForge();

  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    getPlugins();
  }, []);

  const { nodes, edges: initialEdges } = useMemo(
    () => buildGraph(plugins),
    [plugins],
  );

  const layoutedNodes = useMemo(() => {
    if (!nodes.length) return [];
    return applyLayout(nodes, initialEdges);
  }, [nodes, initialEdges]);

  const edgeTypes = { floating: FloatingEdge };

  useEffect(() => {
    setEdges((prev) => {
      if (prev.length === 0) {
        return initialEdges;
      }
      return prev;
    });
  }, [initialEdges]);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={layoutedNodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          defaultEdgeOptions={{
            type: "floating",
            style: { stroke: "var(--muted)", strokeWidth: 1 },
          }}
          proOptions={{
            hideAttribution: true,
          }}
        />
        <Background
          variant={BackgroundVariant.Cross}
          color="var(--sidebar-border)"
          bgColor="var(--background)"
          gap={10}
          size={1}
        />
      </ReactFlowProvider>
    </div>
  );
};
