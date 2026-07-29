import { AgentRuntimeError } from "../agent-errors.ts";
import type { AgentRequiredAction } from "../intent/agent-intent-gateway.ts";

export function validateAgentActionGraph(
  actions: AgentRequiredAction[],
  maxToolCalls: number,
): void {
  if (actions.length > maxToolCalls) {
    throw invalidGraph(
      `Action count ${actions.length} exceeds tool-call limit ${maxToolCalls}`,
      "AGENT_ACTION_LIMIT_EXCEEDED",
    );
  }

  const byId = new Map<string, AgentRequiredAction>();
  for (const action of actions) {
    if (!action.id.trim() || byId.has(action.id)) {
      throw invalidGraph(`Duplicate or empty action id: ${action.id}`);
    }
    byId.set(action.id, action);
  }
  for (const action of actions) {
    for (const dependency of action.dependsOn) {
      if (!byId.has(dependency)) {
        throw invalidGraph(`Action ${action.id} depends on unknown action ${dependency}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw invalidGraph(`Action dependency cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)!.dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const action of actions) visit(action.id);
}

function invalidGraph(
  detail: string,
  code = "AGENT_ACTION_GRAPH_INVALID",
): AgentRuntimeError {
  return new AgentRuntimeError(
    `Invalid agent action graph: ${detail}`,
    code,
    "Agent produced an invalid action sequence",
    400,
  );
}
