# Global Agent Stream Network + Confirm Z - 2026-05-31

- [x] Diagnosticar causa do `NetworkError` no envio por stream.
- [x] Corrigir stream sem quebrar toast/global chat.
- [x] Aumentar z-index do `AppConfirmPanel` acima do `BaseModal`.
- [x] Verificar testes focados e builds.

Raiz:
- O endpoint SSE novo usava `reply.hijack()` mas nao enviava `Access-Control-Allow-Origin`.
- Os streams antigos (`workflows.routes.ts`) mandam esse header explicitamente.
- Browser bloqueava o fetch cross-origin e mostrava `NetworkError when attempting to fetch resource`.

Verificado:
- `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `node --test src/core/routes/agent-panel.routes.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- `npm run build` em `server`
- `npm run build` em `client-vue`
