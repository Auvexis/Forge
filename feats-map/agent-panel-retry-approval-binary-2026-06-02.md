# Agent Panel Retry Approval Binary - 2026-06-02

- [x] Criar teste para evento/mensagem de retry antes de nova tentativa da tool.
- [x] Criar teste para approval nao recarregar/esvaziar mensagens locais ao confirmar/recusar.
- [x] Criar teste para download grande nunca aparecer como raw payload em evento/modelo.
- [x] Implementar evento `agent:tool-retry` e stream `retrying`.
- [x] Manter mensagens locais no approval sem `loadMessages` imediato.
- [x] Reforcar protecao de binario pesado em eventos/modelo.
- [x] Rodar testes e builds.
- [x] Commitar somente arquivos desta tarefa.
