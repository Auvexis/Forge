import { useEffect, useMemo, useState, useCallback } from "react";
import { useForge } from "~/providers/ForgeProvider";
import { buildGraph } from "../utils/buildGraph";
import { applyLayout } from "../utils/applyGraphLayout";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  addEdge,
} from "@xyflow/react";
import { nodeTypes } from "./PluginNode";
import { FloatingEdge } from "./FloatingEdge";

interface Props {
  searchQuery?: string;
}

export const PluginTree = ({ searchQuery = "" }: Props) => {
  const { plugins, getPlugins } = useForge();

  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    getPlugins();
  }, []);

  const { nodes, edges: initialEdges } = useMemo(
    () => buildGraph(plugins),
    [plugins],
  );

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    const query = searchQuery.toLowerCase();
    return nodes.filter(n => 
      n.data.label.toLowerCase().includes(query) ||
      n.id.toLowerCase().includes(query)
    );
  }, [nodes, searchQuery]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return initialEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes, initialEdges]);

  const layoutedNodes = useMemo(() => {
    if (!filteredNodes.length) return [];
    return applyLayout(filteredNodes, filteredEdges);
  }, [filteredNodes, filteredEdges]);
  
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
    <div className="w-full h-full relative group/graph">
      <ReactFlow
        nodes={layoutedNodes}
        edges={filteredEdges}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{
          type: "floating",
          style: { stroke: "var(--border)", strokeWidth: 1 },
        }}
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--chart-5)"
          bgColor="transparent"
          gap={20}
          size={1}
        />
      </ReactFlow>
    </div>
  );
};
