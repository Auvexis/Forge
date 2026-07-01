import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import type {
  AgentMemoryRecord,
  AgentToolDefinition,
  SaveAgentMemoryPayload,
} from '../../features/agent-runtime/types/agent.types.ts'

export const agentToolsApi = {
  listTools: () => apiRequest<AgentToolDefinition[]>(ENDPOINTS.AGENT_TOOLS),

  listMemory: () => apiRequest<AgentMemoryRecord[]>(ENDPOINTS.AGENT_MEMORY),

  saveMemory: (payload: SaveAgentMemoryPayload) =>
    apiRequest<AgentMemoryRecord>(ENDPOINTS.AGENT_MEMORY, {
      method: 'POST',
      body: payload,
    }),

  deleteMemory: (memoryId: string) =>
    apiRequest<null>(ENDPOINTS.AGENT_MEMORY_BY_ID(memoryId), {
      method: 'DELETE',
    }),
}
