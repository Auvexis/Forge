# Tools Agent Plan Executor Rewrite - 2026-06-03

Goal: substituir o loop antigo `LLM -> tool -> LLM -> tool` por plano unico + executor deterministico, com chat persistido por arquivo no profile.

Tasks:
- [x] Criar contratos e testes vermelhos para `AgentPlanExecutor`, `AgentPlanRepairer`, `AgentChoiceDetector`.
- [x] Implementar executor deterministico minimo com eventos de tool lifecycle.
- [ ] Refatorar `AgentRunner` para usar plano unico e remover caminho antigo de loop compacto.
- [ ] Refatorar Ollama adapter para APIs de plano/reparo/final.
- [ ] Adicionar `agentTool.selection` no manifest e loader, com Drive `listFiles` como caso inicial.
- [ ] Criar `AgentChatFileStore` em `profiles/<profileId>/chats/<chatId>/chat.json`.
- [ ] Integrar Agent Panel com storage em arquivo e short-term memory em `memory.sqlite` por chat.
- [ ] Atualizar frontend para renderizar progress, approval e choice persistidos.
- [ ] Remover ou isolar resquicios da arquitetura antiga backend/frontend.
- [ ] Rodar testes focados e builds.
- [ ] Commitar mudancas.
