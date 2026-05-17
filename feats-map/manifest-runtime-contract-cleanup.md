# Manifest Runtime Contract Cleanup

Goal: remover do contrato de plugin campos de UI legada que nao sao usados por workflows: `methods.*.ui`, `ui.component`, `ui.actions` e `x-sailor-display`.

Principios:
- Manifest de plugin descreve capacidade/runtime, nao tela antiga de execucao isolada.
- Workflow usa `metadata`, `parameters`, `responseSchema`, `auth`, `methods` e `triggers`.
- SDK deve ser a fonte da verdade do contrato.
- Server nao deve exigir campos que nao executa.
- TDD antes de cada mudanca.
- Cada task concluida deve ser marcada neste arquivo e commitada.

## Diagnostico

Hoje esses campos ainda aparecem no contrato publico:
- `sailor-sdk/src/types.ts`
- `sailor-sdk/src/manifest-schema.ts`
- `sailor-sdk/test/sdk.test.ts`
- `sailor/server/src/plugins/**/manifest.json`
- `sailor/server/src/plugins/_template/manifest.json`
- `sailor-cli/src/templates/plugin/files.js`
- testes do server que ainda criam manifests com `ui`

No runtime de workflow, `buildWorkflowSchema` usa `parameters` e `responseSchema`, mas nao usa `method.ui`, `ui.component`, `ui.actions` ou `x-sailor-display`.

## Decisao recomendada

Remover do contrato novo.

Nao manter como opcional, porque opcional ainda vira ruido e incentiva plugin novo a carregar lixo de UI antiga. O unico cuidado e fazer em ordem:
1. SDK muda primeiro.
2. SDK e publicado no npm.
3. Server baixa a nova versao publicada do `@auvexis/sailor-sdk`.
4. Server passa a consumir/validar contrato limpo.
5. Manifests internos e templates sao limpos.
6. `sailor-cli` baixa a nova versao publicada do SDK e para de gerar campos legados.
7. Docs/testes garantem que o campo nao volta.

## Tasks

### Task 1 - Atualizar contrato do SDK

Files:
- Modify: `sailor-sdk/src/types.ts`
- Modify: `sailor-sdk/src/manifest-schema.ts`
- Modify: `sailor-sdk/test/sdk.test.ts`
- Modify: `sailor-sdk/README.md`

Steps:
- [x] Escrever teste falhando para aceitar metodo sem `ui`.
- [x] Escrever teste falhando para rejeitar `methods.*.ui` como propriedade adicional.
- [x] Escrever teste falhando para rejeitar `x-sailor-display` em `responseSchema`.
- [x] Remover `PluginMethodUI`.
- [x] Remover `ui` de `PluginMethodManifest`.
- [x] Remover `x-sailor-display` de `JSONSchemaProperty` e `JSONSchemaResponse`.
- [x] Atualizar `manifestSchema` para `MethodDefinition.required = ["metadata", "parameters", "responseSchema"]`.
- [x] Remover `$defs.MethodUI`.
- [x] Atualizar README para exemplos sem `ui` e sem `x-sailor-display`.
- [x] Rodar `npm test`.
- [x] Rodar `npm run typecheck`.
- [x] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor-sdk add src test README.md
git -C sailor-sdk commit -m "refactor(manifest): remove legacy method ui contract"
```

### Task 2 - Publicar nova versao do SDK no npm

Files:
- Modify: `sailor-sdk/package.json`
- Modify: `sailor-sdk/package-lock.json`

Steps:
- [x] Definir bump de versao do SDK. Recomendado: minor, porque o contrato publico muda e plugins antigos podem quebrar.
- [x] Rodar `npm version minor --no-git-tag-version`.
- [x] Rodar `npm test`.
- [x] Rodar `npm run typecheck`.
- [x] Rodar `npm run build`.
- [x] Rodar `npm publish --access public`.
- [x] Confirmar pacote publicado com `npm view @auvexis/sailor-sdk version`.
- [x] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor-sdk add package.json package-lock.json dist
git -C sailor-sdk commit -m "chore(release): publish runtime-only manifest contract"
```

### Task 3 - Atualizar server para a versao publicada do SDK

Files:
- Modify: `sailor/server/package.json`
- Modify: `sailor/server/package-lock.json`
- Modify: `sailor/server/src/core/modules/plugins/loader.test.ts`
- Modify: `sailor/server/src/core/modules/plugins/plugin-manifest-preview.test.ts`
- Modify: outros testes que criam `PluginMethodManifest`

Steps:
- [x] Rodar `npm install @auvexis/sailor-sdk@<nova-versao-publicada>` em `sailor/server`.
- [x] Escrever teste falhando no server para plugin manifest sem `ui` carregar com sucesso.
- [x] Escrever teste falhando para manifest com `ui` retornar erro de propriedade adicional.
- [x] Atualizar fixtures de teste removendo `ui`.
- [x] Atualizar expectativas de erro que citam `methods.*.ui.component`.
- [x] Rodar `npx tsc --noEmit --pretty false`.
- [x] Rodar testes de loader/preview.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor add server/package.json server/package-lock.json server/src/core/modules/plugins
git -C sailor commit -m "refactor(server): use runtime-only plugin manifest contract"
```

### Task 4 - Limpar manifests internos e template do server

Files:
- Modify: `sailor/server/src/plugins/**/manifest.json`
- Modify: `sailor/server/src/plugins/_template/manifest.json`

Steps:
- [x] Remover todos os blocos `methods.*.ui`.
- [x] Remover todos os `x-sailor-display`.
- [x] Validar que cada metodo ainda tem `metadata`, `parameters` e `responseSchema`.
- [x] Rodar validação/load dos plugins internos.
- [x] Rodar `npx tsc --noEmit --pretty false`.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor add server/src/plugins
git -C sailor commit -m "refactor(plugins): remove legacy manifest display metadata"
```

### Task 5 - Atualizar sailor-cli para a versao publicada do SDK

Files:
- Modify: `sailor-cli/package.json`
- Modify: `sailor-cli/package-lock.json`
- Modify: `sailor-cli/src/templates/plugin/files.js`
- Modify: `sailor-cli/test/create-plugin-project.test.js`
- Modify: `sailor-cli/README.md`

Steps:
- [x] Rodar `npm install @auvexis/sailor-sdk@<nova-versao-publicada>` em `sailor-cli`.
- [x] Escrever teste falhando para template `fruityvice` nao conter `ui`, `component`, `actions` ou `x-sailor-display`.
- [x] Escrever teste falhando para template `jsonplaceholder` nao conter campos legados.
- [x] Escrever teste falhando para template `spotify` nao conter campos legados.
- [x] Escrever teste falhando para template `pokeapi` nao conter campos legados.
- [x] Remover `ui: { component: ... }` de todos os manifests gerados.
- [x] Remover `"x-sailor-display"` de todos os `responseSchema` gerados.
- [x] Atualizar README gerado pelo template para explicar que `methods` declara label, parametros e schema de resposta, sem UI component.
- [x] Rodar `npm test`.
- [x] Rodar `npm run build`.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor-cli add package.json package-lock.json src test README.md
git -C sailor-cli commit -m "refactor(cli): generate runtime-only plugin manifests"
```

### Task 6 - Proteger contra regressao

Files:
- Modify: `sailor-sdk/test/sdk.test.ts`
- Modify: `sailor/server/src/core/modules/plugins/loader.test.ts`
- Modify: `sailor-cli/test/create-plugin-project.test.js`

Steps:
- [x] Adicionar teste no SDK para garantir que `ui`, `actions`, `component` e `x-sailor-display` nao passam no schema.
- [x] Adicionar teste no server para garantir que preview/loader reportam erro claro para manifests antigos.
- [x] Adicionar teste no CLI para todos os templates gerados ficarem livres dos campos legados.
- [x] Rodar `npm test` no `sailor-sdk`.
- [x] Rodar testes relevantes no `sailor/server`.
- [x] Rodar `npm test` no `sailor-cli`.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git -C sailor-sdk add test
git -C sailor-sdk commit -m "test(manifest): reject legacy ui fields"
git -C sailor add server/src/core/modules/plugins
git -C sailor commit -m "test(server): reject legacy plugin manifest ui fields"
git -C sailor-cli add test
git -C sailor-cli commit -m "test(cli): prevent legacy manifest ui fields"
```

## Acceptance Criteria

- Manifest novo nao precisa de `methods.*.ui`.
- SDK rejeita `ui`, `component`, `actions` e `x-sailor-display`.
- Server carrega plugins internos sem esses campos.
- Server usa a nova versao publicada do `@auvexis/sailor-sdk`.
- `sailor-cli` usa a nova versao publicada do SDK.
- `sailor-cli` nao gera `ui`, `component`, `actions` ou `x-sailor-display`.
- Workflows continuam recebendo `parameters` e `responseSchema`.
- Nenhum plugin precisa saber de frontend antigo.
- `npm test` passa no `sailor-sdk`.
- Typecheck/testes relevantes passam no `sailor/server`.
- `npm test` passa no `sailor-cli`.

## Riscos

- Plugins externos antigos vao quebrar na validacao. Isso e aceitavel se o objetivo for contrato limpo; se precisar compatibilidade, criar uma task separada de migração com erro amigavel.
- `x-input-type`, `x-label`, `x-dynamic-options` e `x-visible-if` ainda parecem uteis para montar formulario de parametros no workflow. Nao remover neste corte.
