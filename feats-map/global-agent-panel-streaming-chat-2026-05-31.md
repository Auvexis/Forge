# Global Agent Panel Streaming Chat - 2026-05-31

- [x] Frontend: mensagem do usuario aparece otimista antes da resposta do agente.
- [x] Backend: endpoint streaming para mensagem de sessao do Agent Panel.
- [x] Frontend: consumir stream de chunks e atualizar mensagem do agent em tempo real.
- [x] UI: animacao suave bottom-right para usuario e bottom-left para agent.
- [x] Verificacao focada backend/frontend/build.

Verificado:
- `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `node --test src/core/routes/agent-panel.routes.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- `npm run build` em `server`
- `npm run build` em `client-vue`
