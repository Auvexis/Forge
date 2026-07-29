import type { AgentPendingInteraction } from "../contracts/agent-domain-contracts.ts";

export type PendingInteractionReply =
  | { type: "cancel" }
  | { type: "continue" }
  | { type: "retry" }
  | { type: "confirm"; confirmed: boolean }
  | { type: "selection"; value: string; index?: number }
  | { type: "answer"; value: string };

export function routePendingInteractionReply(
  interaction: AgentPendingInteraction,
  message: string,
): PendingInteractionReply {
  const value = message.trim();
  const normalized = normalize(value);

  if (/^(cancel|cancelar|cancele|stop|parar|pare)$/.test(normalized)) {
    return { type: "cancel" };
  }
  if (/^(retry|tentar novamente|tente novamente|repetir|repita)$/.test(normalized)) {
    return { type: "retry" };
  }
  if (/^(continue|continuar|continue|prosseguir|prossiga)$/.test(normalized)) {
    return { type: "continue" };
  }
  if (interaction.kind === "approval") {
    if (/^(sim|yes|confirmo|confirmar|aprovado|aprovar)$/.test(normalized)) {
      return { type: "confirm", confirmed: true };
    }
    if (/^(nao|no|negado|negar|rejeitar|rejeitado)$/.test(normalized)) {
      return { type: "confirm", confirmed: false };
    }
  }
  if (interaction.kind === "selection") {
    const numeric = normalized.match(/^(?:opcao\s*)?#?(\d+)$/);
    if (numeric) {
      return { type: "selection", value, index: Number(numeric[1]) - 1 };
    }
    return { type: "selection", value };
  }
  return { type: "answer", value };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
}
