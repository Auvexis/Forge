# Suite Sidebar + Global Topbar

## Contexto

- Frontend: `client-vue/` usa Vue, Pinia, Vite e componentes compartilhados em `src/shared/components`.
- Backend: `server/` organiza core/modules/routes/plugins; esta feature e apenas chrome de frontend, sem tocar regras de plugins/core.
- Commits recentes mexeram no Workflow Chrome, save status e controles do canvas. Evitar alterar esses arquivos ja modificados no worktree.
- Worktree tem mudancas preexistentes em Workflow Chrome, AppPopover e docs. Nao reverter.

## Tasks

- [x] Criar testes vermelhos para a configuracao da nova sidebar suite.
- [x] Implementar configuracao e layout expandido/minimizado da sidebar com hints.
- [x] Adicionar topbar global que abre command palette.
- [x] Ajustar variaveis de largura ativa para sidebar panels.
- [x] Rodar verificacoes automatizadas; Browser in-app bloqueou localhost com `ERR_BLOCKED_BY_CLIENT`.

## Refinamento visual

- [x] Aumentar largura expandida e reduzir alturas de header/topbar.
- [x] Centralizar searchbar e simplificar header para "Workspace".
- [x] Trocar collapse para ghost sem borda e icone maior.
- [x] Remover borda inteira entre sidebar/topbar e criar divisor curto no header.
- [x] Corrigir main para labels fora do WoobyMenu e apps em grid minimalista de 2 colunas.
