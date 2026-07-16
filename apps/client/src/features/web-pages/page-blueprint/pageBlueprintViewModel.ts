import type {
  PageActionCollectionBinding,
  PageActionOutputBinding,
  PageActionWorkflowSummary,
} from '@/core/page-actions'
import type { PageBlock, PageElementEvent } from '../types/page.types.ts'

export interface PageBlueprintElementNode {
  id: string
  label: string
  tag: string
  depth: number
  events: PageElementEvent[]
}

export interface PageBlueprintWorkflowNode {
  id: string
  label: string
  workflowName: string
  triggerName: string
  returnCount: number
  eventCount: number
}

export interface PageBlueprintBindingNode {
  id: string
  actionId: string
  source: string
  target: string
  mode: 'single' | 'multiple'
}

export interface PageBlueprintViewModel {
  elements: PageBlueprintElementNode[]
  workflows: PageBlueprintWorkflowNode[]
  bindings: PageBlueprintBindingNode[]
}

export function createPageBlueprintViewModel(input: {
  blocks: PageBlock[]
  workflows: PageActionWorkflowSummary[]
  outputBindings: Record<string, PageActionOutputBinding[]>
  collectionBindings: Record<string, PageActionCollectionBinding[]>
}): PageBlueprintViewModel {
  const elements = collectElementNodes(input.blocks)
  const events = elements.flatMap((element) => element.events)
  const actionEventCount = countEventsByAction(events)

  return {
    elements: elements.filter((element) => element.events.length > 0),
    workflows: input.workflows.flatMap((workflow) =>
      workflow.actions
        .filter((action) => actionEventCount[actionId(workflow.id, action.id)])
        .map((action) => ({
          id: actionId(workflow.id, action.id),
          label: action.name,
          workflowName: workflow.name,
          triggerName: action.name,
          returnCount: action.returns.length,
          eventCount: actionEventCount[actionId(workflow.id, action.id)] ?? 0,
        })),
    ),
    bindings: [
      ...Object.entries(input.outputBindings).flatMap(([action, bindings]) =>
        bindings.map((binding) => ({
          id: binding.id,
          actionId: action,
          source: binding.resultPath,
          target: `${binding.target.label} (${binding.target.property})`,
          mode: 'single' as const,
        })),
      ),
      ...Object.entries(input.collectionBindings).flatMap(([action, bindings]) =>
        bindings.map((binding) => ({
          id: binding.id,
          actionId: action,
          source: binding.collectionPath,
          target: binding.targetElementId,
          mode: 'multiple' as const,
        })),
      ),
    ],
  }
}

function collectElementNodes(blocks: PageBlock[], depth = 0): PageBlueprintElementNode[] {
  return blocks.flatMap((block) => [
    {
      id: block.id,
      label: blockLabel(block),
      tag: block.tag,
      depth,
      events: block.events ?? [],
    },
    ...collectElementNodes(block.children ?? [], depth + 1),
  ])
}

function blockLabel(block: PageBlock) {
  return String(block.props?.text ?? block.props?.label ?? block.elementId ?? block.id)
}

function actionId(workflowId: string, triggerId: string) {
  return `page-action:${workflowId}:${triggerId}`
}

function countEventsByAction(events: PageElementEvent[]) {
  return events.reduce<Record<string, number>>((counts, event) => {
    counts[event.actionId] = (counts[event.actionId] ?? 0) + 1
    return counts
  }, {})
}
