import { useInternalNode, getStraightPath } from "@xyflow/react";
import { getNodeIntersection } from "../utils/floatingEdgeUtils";

export const FloatingEdge = ({ id, source, target, style }: any) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getNodeIntersection(sourceNode, targetNode);

  const [edgePath] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });

  return <path id={id} className="react-flow__edge-path" d={edgePath} style={style} />;
};