# Agent Panel approval, waiting-user e steps - 2026-06-01

## Objetivo

Fechar os gaps do Global Agent Chat:

- Confirm/decline approval no chat global.
- Waiting-user nao deixar a LLM escolher primeiro resultado ambiguo.
- Remover intro que repete o prompt do usuario.
- Persistir steps/progress no historico para sobreviver a F5/troca de chat.

## Tasks

- [x] Criar testes vermelhos para persistencia de `agentProgress` e `agentSummary`.
- [x] Criar testes vermelhos para stream de approval no Agent Panel.
- [x] Criar testes vermelhos frontend para renderizar e acionar confirm/decline approval.
- [x] Criar teste vermelho para resultado ambiguo virar `waiting-user` antes da proxima chamada de modelo.
- [x] Implementar persistencia de steps no `AgentPanelChatService`.
- [x] Implementar stream/evento/tipo de approval no Agent Panel.
- [x] Implementar API/store/view de approve/reject no frontend.
- [x] Ajustar intro curta sem ecoar prompt.
- [x] Ajustar guard de ambiguidade.
- [x] Rodar testes focados e build/testes necessarios.
- [x] Fazer commit somente dos arquivos deste bloco.
