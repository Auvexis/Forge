import type { Node } from '@vue-flow/core'

const MARGIN = 28 // padding around node bounding box

/**
 * Returns true if a point is inside the padded bounding box of a node.
 */
function pointInNode(px: number, py: number, node: Node): boolean {
  const w = (node.dimensions?.width  ?? 200) + MARGIN * 2
  const h = (node.dimensions?.height ?? 80)  + MARGIN * 2
  const nx = node.position.x - MARGIN
  const ny = node.position.y - MARGIN
  return px >= nx && px <= nx + w && py >= ny && py <= ny + h
}

/**
 * Samples several points along the cubic bezier curve and checks whether any
 * node bbox is hit.
 */
function bezierHitsNode(
  sx: number, sy: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  tx: number, ty: number,
  nodes: Node[],
  excludeIds: string[],
): Node | null {
  const SAMPLES = 24
  for (let i = 1; i < SAMPLES - 1; i++) {
    const t = i / (SAMPLES - 1)
    const mt = 1 - t
    const px = mt ** 3 * sx + 3 * mt ** 2 * t * cx1 + 3 * mt * t ** 2 * cx2 + t ** 3 * tx
    const py = mt ** 3 * sy + 3 * mt ** 2 * t * cy1 + 3 * mt * t ** 2 * cy2 + t ** 3 * ty

    for (const node of nodes) {
      if (excludeIds.includes(node.id)) continue
      if (pointInNode(px, py, node)) return node
    }
  }
  return null
}

/**
 * Builds cubic bezier control points for a left→right flow and checks node
 * collisions. If a collision is detected it adds a vertical detour above or
 * below the blocking node.
 *
 * Returns [svgPath, labelX, labelY].
 */
export function routedBezierPath(
  sx: number, sy: number,
  tx: number, ty: number,
  nodes: Node[],
  excludeIds: string[],
): [string, number, number] {
  const dx = (tx - sx) * 0.45
  // Standard bezier control points (horizontal handles for left→right flow)
  let cx1 = sx + dx
  let cy1 = sy
  let cx2 = tx - dx
  let cy2 = ty

  const blocker = bezierHitsNode(sx, sy, cx1, cy1, cx2, cy2, tx, ty, nodes, excludeIds)

  if (blocker) {
    const bTop    = blocker.position.y - MARGIN
    const bBottom = blocker.position.y + (blocker.dimensions?.height ?? 80) + MARGIN
    const midX    = (sx + tx) / 2

    // Decide direction: route above if source is above the blocker centre, else below
    const blockerMidY = blocker.position.y + (blocker.dimensions?.height ?? 80) / 2
    const detourY = (sy + ty) / 2 < blockerMidY
      ? bTop    - 40   // above
      : bBottom + 40   // below

    // Build a 2-segment path via a waypoint
    const midY = detourY
    const path =
      `M ${sx} ${sy} ` +
      `C ${sx + dx} ${sy}, ${midX - dx * 0.5} ${midY}, ${midX} ${midY} ` +
      `C ${midX + dx * 0.5} ${midY}, ${tx - dx} ${ty}, ${tx} ${ty}`

    const labelX = midX
    const labelY = midY

    return [path, labelX, labelY]
  }

  // No blocker — standard bezier
  const labelX = 0.125 * sx + 0.375 * cx1 + 0.375 * cx2 + 0.125 * tx
  const labelY = 0.125 * sy + 0.375 * cy1 + 0.375 * cy2 + 0.125 * ty
  const path = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`

  return [path, labelX, labelY]
}
