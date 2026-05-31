# Global Agent Stream Deltas And Loading - 2026-05-31

- [x] Diagnosticar por que chunks do agent nao chegam no Global Agent Chat.
- [x] Criar teste vermelho para SSE com `agent:output-delta` / `agent:thinking-delta`.
- [x] Corrigir backend/frontend para streaming incremental real.
- [x] Adicionar loading/typing igual Chat Panel do Workflow Editor.
- [x] Verificar testes focados e builds.

Raiz:
- O stream do Agent Panel ignorava `agent:thinking-delta`.
- O frontend nao criava mensagem assistant pendente, entao sem chunk visivel ele parecia travado ate o `done`.
- O SSE tambem nao tinha evento inicial para ativar loading imediatamente.

Verificado:
- `node --test src/core/routes/agent-panel.routes.test.ts`
- `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `npm run build` em `server`
- `npm run build` em `client-vue`
