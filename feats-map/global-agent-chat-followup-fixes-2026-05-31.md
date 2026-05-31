# Global Agent Chat Follow-up Fixes - 2026-05-31

- [x] Restaurar steps de sucesso das tools.
- [x] Remover a resposta final textual quando o run usa tools, mantendo apenas resumo de tools.
- [x] Manter steps antigos quando um novo prompt termina.
- [x] Evitar avatar/nome repetido em mensagens consecutivas do agente.
- [x] Rodar testes focados e builds praticos.

## Notas

- Corrige o commit anterior `581dd8fe`, que removeu o status errado.
- Nao tocar em mudancas antigas da worktree.

## Verificacao

- `server`: `node --test src/core/routes/agent-panel.routes.test.ts`
- `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `server`: `npm run build`
- `client-vue`: `npm run build`
