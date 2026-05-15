# Dev Workflow UI + Trigger Fixes

## Objetivo

Corrigir webhook com Public URL e implementar ajustes de triggers, variables, cron node, sidebar/topbar, form URLs e painel bottom de execucao por trigger.

## Tasks

- [x] Corrigir webhook Public URL em dev/prod sem quebrar isolamento dev.
- [x] Remover Trigger do tipo Event do frontend/backend.
- [x] Simplificar workflow variables para name/value e novo dropdown de criacao.
- [x] Ajustar visual do Cron node para nome + expressao.
- [x] Colapsar topbar junto da sidebar e mover search para sidebar.
- [x] Adicionar Open in new tab no PROD em Form URLs.
- [x] Criar bottom GlobalAppPanel com tabs por trigger e timeline em tempo real.
- [x] Remover logs antigos do painel lateral quando migrado.
- [x] Validar testes/build.
- [x] Commit.

## Validacao

- `node --import ts-node/register --test src/core/modules/workflows/workflow-triggers.test.ts src/core/modules/workflows/dev-session/dev-workflow-session-manager.test.ts`
- `npm run build` em `server`
- `npm run build` em `client-vue`
