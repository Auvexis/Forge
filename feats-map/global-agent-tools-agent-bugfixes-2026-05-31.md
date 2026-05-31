# Global Agent + Tools Agent Bugfixes - 2026-05-31

- [x] Mapear commits recentes e fluxo server/client do Global Agent Chat.
- [x] Reproduzir por teste o flick causado ao trocar mensagens locais por mensagens do servidor no fim do stream.
- [x] Remover a mensagem final extra de sucesso, mantendo apenas o resumo de tools usadas.
- [x] Adicionar schema/input no Tools Agent para receber mensagem de node anterior sem depender do Chat Trigger.
- [x] Rodar testes focados e build/checks praticos.

## Notas

- Respeitar regra: plugin nao chama core/engines; ajuste do Tools Agent deve ficar no core/shared schema.
- Branch atual mantida. Nao criar branch nova.

## Mapeamento Tools Agent

- `AiAgentEditor.vue` configura `prompt` (system prompt) e agora `inputMessage` (mensagem do usuario).
- `ai-agent.ts` avalia `prompt` e `inputMessage` com `TemplateEngine` usando `trigger`, `steps`, `variables` e `env`.
- Se `inputMessage` estiver preenchido, ele vira `AgentRunInput.userMessage`.
- Se `inputMessage` estiver vazio, fallback segue igual: `trigger.message`, `trigger.text`, `trigger.body.message`, `trigger.body.text`, ou JSON do payload.
- Plugins continuam genericos: o plugin/tool so recebe defaults avaliados pelo core em `AiToolNode.inputDefaults`.

## Verificacao

- `server`: `node --test src/core/nodes/handlers/ai-agent.test.ts src/core/routes/agent-panel.routes.test.ts`
- `client-vue`: `node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `server`: `npm run build`
- `client-vue`: `npm run build`
