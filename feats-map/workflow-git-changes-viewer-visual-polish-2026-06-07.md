# Workflow Git Changes Viewer Visual Polish - 2026-06-07

## Goal
Melhorar o visual do Changes Viewer usando `tokens.css`, tema de JSON e diff mais claro.

## Tasks
- [x] Task 1: Melhorar visual do diff viewer.
  - Usar tokens sem cores hardcoded desnecessarias.
  - Adicionar gutter mais forte.
  - Adicionar chips de contagem: added, removed, modified.
  - Deixar linhas added/removed/modified bem visiveis.

- [ ] Task 2: Adicionar tema de JSON.
  - Tokenizar linhas JSON sem `v-html`.
  - Cores para key, string, number, boolean/null e punctuation.
  - Usar o mesmo renderer no raw e no diff.

- [ ] Task 3: Melhorar estados e acabamento do painel.
  - Empty/loading/error states melhores.
  - Toolbar mais refinada.
  - Viewer com borda, sombra interna e scroll mais polido.
  - Testar contratos, type-check e build.
