import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from "d3-force";

export const applyLayout = (nodes: any[], edges: any[]) => {
  // Copia profunda dos nós e edges para não mutar os originais do ReactFlow
  const simNodes = nodes.map((n) => ({ ...n }));
  const simEdges = edges.map((e) => ({ source: e.source, target: e.target }));

  const simulation = forceSimulation(simNodes)
    .force("charge", forceManyBody().strength(-200))
    .force(
      "link",
      forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(120),
    )
    .force("center", forceCenter(180, 250))
    .force("collision", forceCollide(50))
    .stop();

  for (let i = 0; i < 200; i++) {
    simulation.tick();
  }

  // Mapeia as posições calculadas de volta para os nós originais
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: simNodes[i].x ?? 0,
      y: simNodes[i].y ?? 0,
    },
  }));
};
