import { workflowsApi } from '@/core/api/workflows.api'
import {
  buildDefaultActionInput,
  mapCallableWorkflowsToPageActions,
} from '../application/pageActionCatalog'
import type {
  PageActionCatalogGateway,
  PageActionRunRequest,
  PageActionRunResult,
  PageActionRunnerGateway,
} from '../domain/pageAction.types'

export class WorkflowPageActionGateway implements PageActionCatalogGateway, PageActionRunnerGateway {
  async listAvailableActions() {
    const workflows = await workflowsApi.listCallable()
    return mapCallableWorkflowsToPageActions(workflows)
  }

  async runAction(request: PageActionRunRequest): Promise<PageActionRunResult> {
    try {
      const input = Object.keys(request.input).length > 0
        ? request.input
        : buildDefaultActionInput(request.action.inputs)
      const result = await workflowsApi.execute(request.action.workflowId, input, undefined, request.action.triggerId)
      return {
        ok: true,
        executionId: result.executionId,
        data: result,
        meta: {
          workflowId: request.action.workflowId,
          triggerId: request.action.triggerId,
          actionId: request.action.id,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to run page action.',
        meta: {
          workflowId: request.action.workflowId,
          triggerId: request.action.triggerId,
          actionId: request.action.id,
        },
      }
    }
  }
}

export const workflowPageActionGateway = new WorkflowPageActionGateway()
