import type { UniverseVector3 } from '../types/universe.types'

export function getUniverseOrbitPosition(
  radius: number,
  angle: number,
  lane: number,
  spiralTightness = 0.42,
): UniverseVector3 {
  const armAngle = angle + radius * spiralTightness

  return {
    x: Math.cos(armAngle) * radius,
    y: (lane - 1) * 1.15 + Math.sin(angle * 1.7) * 0.35,
    z: Math.sin(armAngle) * radius,
  }
}
