import type { PageBlueprintEdge, PageBlueprintGraph, PageBlueprintGraphInput, PageBlueprintNode } from './pageBlueprint.types.ts'

export function buildPageBlueprintGraph(input: PageBlueprintGraphInput): PageBlueprintGraph {
  const action = input.selectedAction
  if (!action) return { nodes: [], edges: [] }

  const nodes: PageBlueprintNode[] = [
    {
      id: 'event:selected',
      kind: 'event',
      label: 'Page Event',
      detail: 'Click, submit, mount',
      icon: 'radio',
      x: 24,
      y: 74,
    },
    {
      id: `action:${action.id}`,
      kind: 'workflow-action',
      label: action.name,
      detail: action.workflowName,
      icon: 'workflow',
      x: 250,
      y: 74,
    },
  ]
  const edges: PageBlueprintEdge[] = [
    {
      id: `edge:event:${action.id}`,
      from: 'event:selected',
      to: `action:${action.id}`,
      label: action.triggerType,
    },
  ]

  const actionInputs = input.pageActions?.inputBindings?.[action.id] ?? {}
  Object.values(actionInputs).forEach((binding, index) => {
    const nodeId = `input:${binding.id}`
    nodes.push({
      id: nodeId,
      kind: 'input-binding',
      label: binding.inputKey,
      detail: binding.source === 'scope'
        ? binding.scopePath ?? 'item'
        : binding.target?.label ?? binding.target?.elementId ?? 'Element',
      icon: binding.source === 'scope' ? 'braces' : 'log-in',
      x: 250,
      y: 180 + index * 66,
    })
    edges.push({
      id: `edge:${nodeId}:${action.id}`,
      from: nodeId,
      to: `action:${action.id}`,
      label: binding.source,
    })
  })

  const outputBindings = input.pageActions?.outputBindings?.[action.id] ?? []
  outputBindings.forEach((binding, index) => {
    const nodeId = `output:${binding.id}`
    nodes.push({
      id: nodeId,
      kind: 'result-binding',
      label: binding.resultPath,
      detail: binding.target.label,
      icon: 'log-out',
      x: 500,
      y: 52 + index * 66,
    })
    edges.push({
      id: `edge:${action.id}:${nodeId}`,
      from: `action:${action.id}`,
      to: nodeId,
      label: binding.target.property,
    })
  })

  const collectionBindings = input.pageActions?.collectionBindings?.[action.id] ?? []
  collectionBindings.forEach((binding, index) => {
    const nodeId = `collection:${binding.id}`
    nodes.push({
      id: nodeId,
      kind: 'collection-binding',
      label: binding.collectionPath,
      detail: `${binding.mode ?? 'repeater'} -> ${binding.targetElementId}`,
      icon: binding.mode === 'table' ? 'table-2' : 'repeat',
      x: 500,
      y: 220 + index * 66,
    })
    edges.push({
      id: `edge:${action.id}:${nodeId}`,
      from: `action:${action.id}`,
      to: nodeId,
      label: binding.mode ?? 'repeat',
    })
  })

  nodes.push({
    id: 'javascript:selected-element',
    kind: 'javascript',
    label: 'Element JavaScript',
    detail: 'Selected block script hook',
    icon: 'code-2',
    x: 744,
    y: 74,
  })
  edges.push({
    id: `edge:${action.id}:javascript`,
    from: `action:${action.id}`,
    to: 'javascript:selected-element',
    label: 'optional',
  })

  return { nodes, edges }
}
