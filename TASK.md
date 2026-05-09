# Milestone 2.1 - Executor Decomposition & SRP Refactoring

## Contexto Arquitetural

- O core de workflows deve orquestrar execucoes, traversal do grafo, retry, eventos SSE e persistencia de logs.
- Handlers de utility nodes devem viver em `server/src/core/nodes/` e serem testaveis de forma isolada.
- A execucao de plugins deve permanecer no caminho isolado de plugins. Logica de plugin nao deve vazar para o core de utility nodes.
- O registry deve ser a fronteira explicita entre o executor e os handlers de nos.

## Tarefas

- [x] Mapear `ND8_FEATURES_PLAN.md`, commits recentes e responsabilidades atuais do `server`.
- [x] Criar este `TASK.md` no root do projeto.
- [ ] Criar contrato `NodeHandler`, contexto de execucao de nos e helpers compartilhados em `server/src/core/nodes/`.
- [ ] Criar `NodeHandlerRegistry` para resolver utility nodes e manter plugins fora do registry de utility handlers.
- [ ] Escrever testes unitarios para os handlers simples: `if`, `set`, `switch`, `merge`, `event-listener`, `trigger`.
- [ ] Extrair handlers simples para arquivos isolados em `server/src/core/nodes/handlers/`.
- [ ] Escrever testes unitarios para handlers com dependencias: `code`, `http`, `event`, `respond-webhook`, `subworkflow`.
- [ ] Extrair handlers com dependencias mantendo injecao explicita no contexto, sem imports cruzados desnecessarios.
- [ ] Extrair execucao de subgrafos reutilizavel para `loop` e `split-in-batches`.
- [ ] Escrever testes unitarios para `loop` e `split-in-batches` cobrindo colecoes invalidas e variaveis de iteracao/batch.
- [ ] Reduzir `server/src/core/modules/workflows/executor.ts` para orquestracao, retry, eventos, traversal e dispatch.
- [ ] Garantir que dispatch de plugin continue usando `PluginExecutor` por caminho isolado e com parametros avaliados pelo workflow parser.
- [ ] Rodar `npm run build` no `server`.
- [ ] Rodar a suite de testes do server.
- [ ] Revisar `TASK.md`, marcar todas as features concluidas e commitar o checkpoint final.

## Commits Planejados

- `docs: add milestone 2.1 task checklist`
- `refactor(server): add workflow node handler contracts`
- `refactor(server): extract simple utility node handlers`
- `refactor(server): extract dependency-backed node handlers`
- `refactor(server): extract subgraph utility node handlers`
- `refactor(server): slim workflow executor orchestration`
