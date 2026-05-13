# Suite Sidebar + Global Topbar

## Contexto

- Frontend: `client-vue/` usa Vue, Pinia, Vite e componentes compartilhados em `src/shared/components`.
- Backend: `server/` organiza core/modules/routes/plugins; esta feature e apenas chrome de frontend, sem tocar regras de plugins/core.
- Commits recentes mexeram no Workflow Chrome, save status e controles do canvas. Evitar alterar esses arquivos ja modificados no worktree.
- Worktree tem mudancas preexistentes em Workflow Chrome, AppPopover e docs. Nao reverter.

## Tasks

- [x] Criar testes vermelhos para a configuracao da nova sidebar suite.
- [ ] Implementar configuracao e layout expandido/minimizado da sidebar com hints.
- [ ] Adicionar topbar global que abre command palette.
- [ ] Ajustar variaveis de largura ativa para sidebar panels.
- [ ] Rodar verificacoes e revisar comportamento visual basico.
