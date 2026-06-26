export interface WorkflowSelectionInput {
  includeTrigger: boolean
  nodeIds: string[]
}

export function selectAllWorkflowNodeIds(input: WorkflowSelectionInput): string[] {
  return [
    ...(input.includeTrigger ? ['trigger'] : []),
    ...input.nodeIds,
  ]
}

export function normalizeWorkflowSelection(input: WorkflowSelectionInput & { selection: string[] }): string[] {
  const selectable = new Set(selectAllWorkflowNodeIds(input))
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const id of input.selection) {
    if (!selectable.has(id) || seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }

  return normalized
}
