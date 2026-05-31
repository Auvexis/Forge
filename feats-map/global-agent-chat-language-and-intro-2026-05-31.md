# Global Agent Chat Language And Intro - 2026-05-31

- [x] Detectar idioma do input do usuario para mensagens locais de progresso.
- [x] Gerar uma frase inicial contextual antes dos steps.
- [x] Evitar anexar a frase inicial na mensagem assistente antiga.
- [x] Atualizar testes focados.
- [x] Rodar builds praticos.

## Notas

- Nao tocar em mudancas antigas da worktree.
- O runtime continua sem gerar resposta final depois de tools no painel.
- A frase inicial deve ser local/barata, sem chamar modelo extra.

## Verificacao

- [x] `server`: `node --test src/core/routes/agent-panel.routes.test.ts`
- [x] `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- [x] `server`: `npm run build`
- [x] `client-vue`: `npm run build`
