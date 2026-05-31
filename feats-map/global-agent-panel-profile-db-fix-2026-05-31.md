# Global Agent Panel Profile DB Fix - 2026-05-31

- [x] Reproduzir por teste que o Agent Panel deve gravar sessões no DB de workflows do perfil ativo.
- [x] Corrigir `AgentPanelChatService` para usar `WorkflowRepository.database()` por padrão.
- [x] Verificar fluxo de memória: sem memory node, short-term SQLite, long-term PostgreSQL/plugin.
- [x] Rodar testes focados e build backend.

## Verification

- `server`: `node --test src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- `server`: `node --test src/core/modules/agent-runtime/memory/agent-memory-mode.test.ts src/core/modules/agent-runtime/agent-runner.test.ts`
- `server`: `npm run build`
