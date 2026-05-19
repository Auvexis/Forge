# PluginAuth base inputs

## Problema

`BaseVariableInput` permite inserir `{{ variables.KEY }}` em campos que nao resolvem antes da conexao/auth.
Isso quebra PluginAuth porque a credencial fica literal.

## Tasks

- [x] Trocar Node Identifier para `BaseInput`.
- [x] Trocar credenciais do `PluginMenuAuth` para `BaseInput`.
- [x] Atualizar teste de contrato.
- [x] Rodar teste focado/build.
- [x] Commitar correcao.
