# Workflow Delete Git Folder Cleanup

## Objetivo

Quando deletar um workflow, remover tambem a pasta Git dele no profile:

`<profile>/data/workflows-git/<workflowId-safe>`

## Tasks

- [x] Task 1: Investigar e cobrir com testes.
  - Confirmar que delete atual apaga so SQLite.
  - Criar teste no `WorkflowGitSnapshotService` para remover repo.
  - Criar teste no `WorkflowRepository` para chamar cleanup no delete.

- [x] Task 2: Implementar cleanup.
  - Adicionar remover repo no service.
  - Registrar cleanup quando `setWorkflowGitSnapshotDataDir` configura o service.
  - Chamar cleanup dentro de `deleteWorkflow`.

- [x] Task 3: Verificar e commitar.
  - Rodar testes backend alvo.
  - Rodar type-check/test/build conforme necessario.
  - Commitar apenas arquivos desta task.
