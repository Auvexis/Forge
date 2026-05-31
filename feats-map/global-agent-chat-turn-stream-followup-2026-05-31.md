# Global Agent Chat Turn Stream Followup - 2026-05-31

- [x] Remover falso positivo de idioma PT causado por `email`.
- [x] Fazer a intro sair em varios deltas, com delay curto.
- [x] Usar ids por turno para progress e summary, evitando sobrescrever mensagens antigas.
- [x] Atualizar testes focados de rota e contrato do painel.
- [x] Rodar builds praticos.

## Verificacao

- [x] `server`: `node --test src/core/routes/agent-panel.routes.test.ts`
- [x] `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [x] `server`: `npm run build`
- [x] `client-vue`: `npm run build`
