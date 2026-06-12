import type { GraphNode } from '@vue-flow/core'
import { getSmoothStepPath } from '@vue-flow/core'
import type { Position } from '@vue-flow/core'

const MARGIN = 28

function pointInNode(px: number, py: number, node: GraphNode): boolean {
  const w = (node.dimensions?.width  ?? 200) + MARGIN * 2
  const h = (node.dimensions?.height ?? 80)  + MARGIN * 2
  const nx = node.position.x - MARGIN
  const ny = node.position.y - MARGIN
  return px >= nx && px <= nx + w && py >= ny && py <= ny + h
}

function bezierHitsNode(
  sx: number, sy: number,
  cx1: number, cy1: number,
  cx2: number, cy2: number,
  tx: number, ty: number,
  nodes: GraphNode[],
  excludeIds: string[],
): GraphNode | null {
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
 * Adaptive routing:
 * - Uses a smooth bezier when source → target flows naturally left-to-right with enough horizontal space.
 * - Falls back to smoothstep (elbow routing) when the connection goes backwards or the
 *   horizontal gap is too small (would produce a distorted S-curve, like n8n does).
 * - Auto-detours around blocking nodes on the bezier path.
 *
 * Returns [svgPath, labelX, labelY].
 */
export function routedBezierPath(
  sx: number, sy: number,
  tx: number, ty: number,
  sourcePosition: Position,
  targetPosition: Position,
  nodes: GraphNode[],
  excludeIds: string[],
): [string, number, number] {
  const horizontalGap = tx - sx
  const BEZIER_THRESHOLD = 80 // min px to use bezier

  // ── Fallback to SmoothStep when going backwards or too close ──────────
  if (horizontalGap < BEZIER_THRESHOLD) {
    const [path, lx, ly] = getSmoothStepPath({
      sourceX: sx, sourceY: sy, sourcePosition,
      targetX: tx, targetY: ty, targetPosition,
      borderRadius: 16,
    })
    return [path, lx, ly]
  }

  // ── Bezier control points ──────────────────────────────────────────────
  const dx = horizontalGap * 0.45
  const cx1 = sx + dx
  const cy1 = sy
  const cx2 = tx - dx
  const cy2 = ty

  // ── Auto-routing: detour around blocking nodes ─────────────────────────
  const blocker = bezierHitsNode(sx, sy, cx1, cy1, cx2, cy2, tx, ty, nodes, excludeIds)

  if (blocker) {
    const bTop    = blocker.position.y - MARGIN
    const bBottom = blocker.position.y + (blocker.dimensions?.height ?? 80) + MARGIN
    const midX    = (sx + tx) / 2
    const blockerMidY = blocker.position.y + (blocker.dimensions?.height ?? 80) / 2
    const detourY = (sy + ty) / 2 < blockerMidY ? bTop - 40 : bBottom + 40

    const path =
      `M ${sx} ${sy} ` +
      `C ${cx1} ${sy}, ${midX - dx * 0.5} ${detourY}, ${midX} ${detourY} ` +
      `C ${midX + dx * 0.5} ${detourY}, ${cx2} ${ty}, ${tx} ${ty}`

    return [path, midX, detourY]
  }

  // ── Standard bezier ────────────────────────────────────────────────────
  const labelX = 0.125 * sx + 0.375 * cx1 + 0.375 * cx2 + 0.125 * tx
  const labelY = 0.125 * sy + 0.375 * cy1 + 0.375 * cy2 + 0.125 * ty
  const path = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`

  return [path, labelX, labelY]
}
