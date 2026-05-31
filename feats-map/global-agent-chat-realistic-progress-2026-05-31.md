# Global Agent Chat Realistic Progress - 2026-05-31

- [x] Mostrar loading local imediatamente depois do input.
- [x] Enviar uma resposta inicial curta antes dos steps.
- [x] Espacar os steps de tools para nao aparecerem todos juntos.
- [x] Melhorar spacing/tamanho/posicao dos steps agrupados.
- [x] Cortar a geracao da resposta final na origem para runs do painel com tools.
- [x] Evitar persistir mensagem assistente vazia quando a resposta final for pulada.
- [x] Rodar builds praticos.

## Notas

- Nao tocar em mudancas antigas da worktree.
- O painel envia `skipFinalResponseAfterToolUse` no payload; workflows normais continuam gerando resposta final.
- O stream ainda mostra loading, uma frase inicial curta, steps espacados e resumo das tools.

## Verificacao

- [x] `server`: `node --test src/core/routes/agent-panel.routes.test.ts`
- [x] `server`: `node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts src/core/nodes/handlers/ai-agent.test.ts`
- [x] `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [x] `server`: `npm run build`
- [x] `client-vue`: `npm run build`
