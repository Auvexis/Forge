export type WorkflowCanvasFeatureFlagEnv = Record<string, string | boolean | undefined>

const ENABLED_VALUES = new Set(['true', '1', 'yes'])

export function shouldUseWorkflowBaseCanvas(env: WorkflowCanvasFeatureFlagEnv = import.meta.env): boolean {
  const value = env.VITE_WORKFLOW_BASE_CANVAS
  if (typeof value === 'boolean') return value
  return ENABLED_VALUES.has(String(value ?? '').trim().toLowerCase())
}
