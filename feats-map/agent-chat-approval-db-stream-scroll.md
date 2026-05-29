# Agent Chat Approval DB Stream Scroll

- [x] Reproduzir que rotas de approval devem usar o banco ativo do WorkflowRepository.
- [x] Corrigir approve/reject para nao usar banco global sem migration.
- [x] Evitar resposta direta no Accept e deixar SSE atualizar o chat.
- [x] Fazer auto-scroll acompanhar deltas/conteudo, nao so quantidade de mensagens.
- [x] Rodar verificacoes backend/frontend.
- [x] Commitar apenas arquivos do escopo.
