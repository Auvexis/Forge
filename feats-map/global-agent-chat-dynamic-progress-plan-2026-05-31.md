# Global Agent Chat Dynamic Progress Plan - 2026-05-31

Objetivo: deixar o Global Agent Chat mais vivo, com mensagens de progresso antes/durante ferramentas e resumo final, parecido com o Codex.

- [x] Especificar eventos de progresso no stream do Agent Panel.
- [x] Reusar `agent:tool-intent`, `agent:tool-start`, `agent:tool-end` no Global Agent Chat.
- [x] Renderizar um ciclo completo por ferramenta: vai usar > usando > usou com sucesso/erro.
- [x] Preservar multiplas ferramentas em ordem, sem sobrescrever chamadas repetidas da mesma tool.
- [x] Mostrar icone do plugin em cada etapa do ciclo da ferramenta.
- [x] Renderizar mensagem final definitiva com todas as ferramentas usadas e icones dos plugins.
- [x] Criar testes contrato backend/frontend antes da implementacao.
- [ ] Validar build server/client e fluxo visual.

## Verification notes

- [x] Backend focused tests: `cd server && node --test src/core/routes/agent-panel.routes.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- [x] Frontend contract tests: `cd client-vue && node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [x] Server build: `cd server && npm run build`
- [x] Client build: `cd client-vue && npm run build`
- [x] Browser smoke opened `http://localhost:23802`, selected `Default`, opened Global Agent panel, and confirmed the published agent chat renders.
- [ ] Browser smoke for a real tool lifecycle is still pending: the local agent response stayed pending after a safe read-only prompt, so no live `Vou usar`/`Executando`/summary cycle was produced in this environment.
