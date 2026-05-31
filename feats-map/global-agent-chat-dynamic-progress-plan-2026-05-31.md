# Global Agent Chat Dynamic Progress Plan - 2026-05-31

Objetivo: deixar o Global Agent Chat mais vivo, com mensagens de progresso antes/durante ferramentas e resumo final, parecido com o Codex.

- [x] Especificar eventos de progresso no stream do Agent Panel.
- [x] Reusar `agent:tool-intent`, `agent:tool-start`, `agent:tool-end` no Global Agent Chat.
- [x] Renderizar um ciclo completo por ferramenta: vai usar > usando > usou com sucesso/erro.
- [x] Preservar multiplas ferramentas em ordem, sem sobrescrever chamadas repetidas da mesma tool.
- [ ] Mostrar icone do plugin em cada etapa do ciclo da ferramenta.
- [ ] Renderizar mensagem final definitiva com todas as ferramentas usadas e icones dos plugins.
- [x] Criar testes contrato backend/frontend antes da implementacao.
- [ ] Validar build server/client e fluxo visual.
