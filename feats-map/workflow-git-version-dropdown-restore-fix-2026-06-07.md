# Workflow Git Version Dropdown Restore Fix

## Objetivo

Melhorar o seletor de versoes do painel Git e corrigir restore de versao selecionada.

## Tasks

- [x] Task 1: Investigar fluxo e criar contratos.
  - Confirmar onde o modal emite `restore`.
  - Confirmar onde o editor chama API de restore.
  - Testar que o modal usa `BaseDropdownSelect`.
  - Testar que `Restore version` emite o hash selecionado.

- [x] Task 2: Melhorar UI do select.
  - Trocar `<select>` nativo por `BaseDropdownSelect`.
  - Mostrar hash, mensagem e data de cada versao.
  - Manter estado disabled/loading/no commits.

- [x] Task 3: Corrigir restore e verificar.
  - Corrigir handler/API/store se estiver ignorando hash.
  - Rodar testes alvo.
  - Rodar type-check/build.
  - Commitar apenas arquivos desta task.
