# Global Agent Realistic Stream Fallback - 2026-05-31

- [x] Criar teste vermelho para resposta final sem deltas nativos.
- [x] Dividir resposta final em chunks SSE antes do `done` quando nao houver delta nativo.
- [x] Manter deltas nativos sem duplicar resposta.
- [x] Verificar testes focados e builds.

Raiz:
- Alguns providers/fluxos nao emitem `agent:output-delta`.
- Nesses casos o Agent Panel recebia so `done`, e a UI trocava a resposta inteira de uma vez.

Verificado:
- `node --test src/core/routes/agent-panel.routes.test.ts`
- `npm run build` em `server`
