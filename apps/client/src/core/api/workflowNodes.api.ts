import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import type { WorkflowNodeCatalogResponse } from '../types/workflow-node-catalog.types'

export const workflowNodesApi = {
  getCatalog: () => apiRequest<WorkflowNodeCatalogResponse>(ENDPOINTS.WORKFLOW_NODE_CATALOG),
}
