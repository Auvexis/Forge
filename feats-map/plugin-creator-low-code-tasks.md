# Plugin Creator Low-Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o Plugin Creator low-code com base backend segura, profile-scoped, versionada e pronta para UI visual.

**Architecture:** Criar uma engine propria (`PluginCreatorEngine`) dentro de `server/src/core/modules/plugin-creator/`, sem misturar com `WorkflowEngine` ou `PluginManager`. O blueprint sera a fonte da verdade; `manifest.json`, `methods.ts`, releases e exports serao gerados a partir dele. Plugins gerados continuam isolados: plugin nao chama core, nao conhece outros plugins, e segue contrato do SDK/shared.

**Tech Stack:** Fastify, TypeScript, Zod, Node fs/path, `@auvexis/sailor-sdk`, Vue 3, Pinia, VueFlow, lucide-vue-next, Vite.

---

## Regras Fixas

- [ ] Usar branch atual `dev`; nao criar branch nova.
- [ ] Antes de implementar cada task, escrever teste quando a task muda regra de negocio ou contrato.
- [ ] Depois de concluir cada task, marcar checkbox neste arquivo e fazer commit.
- [ ] Manter backend como foco principal ate a base estar segura.
- [ ] Nao acoplar Plugin Creator ao Workflow Editor.
- [ ] Nao colocar regra visual dentro do `PluginManager`.
- [ ] Nao salvar blueprint em `global/`.
- [ ] Nao salvar secrets em claro em `tests/last-run.json`, snapshots, logs ou releases.
- [ ] Gerar codigo apenas a partir de blueprint validado.
- [ ] Workflows devem usar apenas versao publicada/instalada, nunca draft.

## Arquivos Planejados

### Backend: Core Plugin Creator

- [ ] Criar `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
  - Responsavel por tipos internos do blueprint, metadata, auth, methods, request, response mapping, error mapping, canvas, snapshots, releases e last-run.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
  - Responsavel por schemas Zod e validacao sem I/O.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-creator-paths.ts`
  - Responsavel por resolver caminhos profile-scoped abaixo de `profiles/<profile-id>/plugin-creator/`.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-blueprint-repository.ts`
  - Responsavel por CRUD de blueprint, snapshots, generated, releases, exports e last-run.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-request-template.ts`
  - Responsavel por renderizar `{{ params.* }}` e `{{ credentials.* }}` com allowlist.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-test-runner.ts`
  - Responsavel por executar HTTP testado, medir tempo, mascarar secrets e salvar last-run.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-response-mapper.ts`
  - Responsavel por extrair paths do response e montar output.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-error-mapper.ts`
  - Responsavel por avaliar regras de erro por status/body path.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-manifest-generator.ts`
  - Responsavel por gerar manifest SDK com metadados `x-created-by`, `x-creator-version`, `x-editable-low-code`.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-methods-generator.ts`
  - Responsavel por gerar `methods.ts` sem JS livre.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-code-generator.ts`
  - Responsavel por orquestrar geracao de `manifest.json`, `methods.ts`, `index.ts`, `package.json`, `README.md` e assets.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-scaffold-service.ts`
  - Responsavel por criar plugin inicial e estrutura default de metodo.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-version-service.ts`
  - Responsavel por snapshots, listagem, rollback e duplicate version.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-publish-service.ts`
  - Responsavel por validar, gerar release fixa e expor pacote para installer.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-export-service.ts`
  - Responsavel por ZIP e folder export.
- [ ] Criar `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
  - Responsavel por coordenar casos de uso e esconder detalhes dos services das rotas.
- [ ] Criar `server/src/core/routes/plugin-creator.routes.ts`
  - Responsavel por endpoints HTTP do Plugin Creator.
- [ ] Modificar `server/src/core/server.ts`
  - Registrar `pluginCreatorRoutes`.

### Backend: SDK/Helpers

- [ ] Criar ou estender helper de erro em local compativel com plugins gerados.
  - Preferencia: se o SDK ja exportar erro equivalente, usar export oficial.
  - Se nao existir no SDK atual, criar wrapper local seguro usado apenas no codigo gerado e planejar upgrade do SDK.
- [ ] Adicionar testes de contrato para `SailorPluginError` e `assertHttpOk`.

### Frontend: Base Depois do Backend

- [ ] Criar `client-vue/src/core/types/plugin-creator.types.ts`.
- [ ] Criar `client-vue/src/core/api/plugin-creator.api.ts`.
- [ ] Criar `client-vue/src/features/plugin-creator/index.ts`.
- [ ] Criar `client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts`.
- [ ] Criar `client-vue/src/features/plugin-creator/stores/pluginCreatorHistory.store.ts`.
- [ ] Criar `client-vue/src/app/pages/PluginCreatorPage.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorHeader.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorCommandMenu.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorFloatingToolbar.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorInspector.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorTestPanel.vue`.
- [ ] Criar `client-vue/src/features/plugin-creator/components/PluginCreatorVersionPanel.vue`.
- [ ] Criar nodes em `client-vue/src/features/plugin-creator/components/nodes/`.
- [ ] Modificar `client-vue/src/app/router.ts`.
  - Adicionar `/plugin-creator` e `/plugin-creator/:pluginId`.
- [ ] Modificar navegacao onde fizer sentido.
  - Link para Plugin Creator na area de plugins/universe sem quebrar `/plugins -> /universe`.

---

## Fase 0: Levantamento Seguro

### Task 0.1: Confirmar branch e estado do worktree

- [x] Rodar `git branch --show-current`.
  - Esperado: `dev`.
- [x] Rodar `git status --short`.
  - Esperado: entender alteracoes existentes antes de tocar arquivos.
- [x] Se houver mudancas de outros arquivos, nao reverter.
- [x] Commit: nao precisa, task de leitura.

### Task 0.2: Mapear pontos de integracao existentes

- [x] Ler `server/src/core/server.ts`.
- [x] Ler `server/src/core/routes/plugins.routes.ts`.
- [x] Ler `server/src/core/modules/plugins/external/plugin-installer.ts`.
- [x] Ler `server/src/core/modules/plugins/external/plugin-runtime-reload-service.ts`.
- [x] Ler `server/src/core/profiles/profile-paths.ts`.
- [x] Ler `server/src/core/runtime/sailor-home.ts`.
- [x] Ler `client-vue/src/app/router.ts`.
- [x] Ler `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`.
- [x] Registrar achados neste arquivo se algum contrato mudar o plano.
- [x] Commit: nao precisa, task de leitura.

---

## Fase 1: Contrato e Blueprint Backend

### Task 1.1: Criar tipos internos do blueprint

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-types.test.ts`

- [x] Escrever teste de shape minimo do blueprint.
  - Deve aceitar metadata, icons, auth, methods vazios e canvas vazio.
- [x] Rodar teste e confirmar falha por arquivo inexistente.
- [x] Criar tipos:
  - `PluginBlueprint`
  - `PluginBlueprintMetadata`
  - `PluginBlueprintIcons`
  - `PluginBlueprintAuth`
  - `PluginBlueprintMethod`
  - `PluginBlueprintInput`
  - `PluginBlueprintRequest`
  - `PluginBlueprintResponseMapping`
  - `PluginBlueprintErrorMapping`
  - `PluginBlueprintCanvas`
  - `PluginCreatorSnapshot`
  - `PluginCreatorRelease`
  - `PluginCreatorLastRun`
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: add plugin creator blueprint types`

### Task 1.2: Criar validacao Zod do blueprint

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts`

- [x] Escrever testes para:
  - handle valido `my-crm`
  - handle invalido com espaco
  - method handle valido `createLead`
  - URL obrigatoria quando request existe
  - input type limitado a `string`, `number`, `boolean`, `object`, `array`, `select`, `file`
  - error mapping sem codigo falha
- [x] Rodar teste e confirmar falha.
- [x] Implementar schemas Zod e funcoes:
  - `validatePluginBlueprint(input)`
  - `parsePluginBlueprint(input)`
  - `validatePluginCreatorId(id)`
  - `validatePluginHandle(handle)`
  - `validateMethodHandle(handle)`
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: validate plugin creator blueprints`

### Task 1.3: Criar resolver de paths profile-scoped

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-creator-paths.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-creator-paths.test.ts`

- [x] Escrever testes para:
  - blueprint fica em `profiles/<profile-id>/plugin-creator/blueprints/<id>/blueprint.json`
  - assets ficam abaixo de `assets/`
  - generated fica abaixo de `generated/`
  - snapshots ficam abaixo de `snapshots/`
  - releases ficam abaixo de `releases/<version>/`
  - path traversal com `../` falha
  - nenhum path aponta para `global/`
- [x] Rodar teste e confirmar falha.
- [x] Implementar:
  - `resolvePluginCreatorProfilePaths(profilePaths)`
  - `resolveBlueprintPaths(profilePaths, blueprintId)`
  - `assertInsidePluginCreatorRoot(root, target)`
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: resolve profile scoped plugin creator paths`

### Task 1.4: Criar repository de blueprint

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-blueprint-repository.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-repository.test.ts`

- [x] Escrever testes com pasta temporaria para:
  - criar blueprint
  - listar blueprints
  - ler blueprint por id
  - atualizar blueprint
  - retornar null quando nao existe
  - impedir id/path traversal
  - escrever JSON com newline final
- [x] Rodar teste e confirmar falha.
- [x] Implementar repository com fs sync/async consistente com padrao atual.
- [x] Repository nao deve chamar generator, publish ou installer.
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: add plugin creator blueprint repository`

### Task 1.5: Criar scaffold service

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-scaffold-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-scaffold-service.test.ts`

- [x] Escrever testes para:
  - criar plugin default com `version: 0.1.0`
  - criar canvas vazio
  - criar metodo default quando solicitado
  - ids previsiveis por gerador injetado em teste
- [x] Rodar teste e confirmar falha.
- [x] Implementar service sem I/O direto; persistencia fica no repository.
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: scaffold plugin creator blueprints`

---

## Fase 2: Rotas CRUD Backend

### Task 2.1: Criar engine inicial

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-creator-engine.test.ts`

- [x] Escrever testes para:
  - `listBlueprints(profileId)`
  - `createBlueprint(profileId, input)`
  - `getBlueprint(profileId, id)`
  - `updateBlueprint(profileId, id, input)`
- [x] Rodar teste e confirmar falha.
- [x] Implementar engine injetando repository, paths e scaffold.
- [x] Garantir que profile ativo entra por parametro, nao global escondido.
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: add plugin creator engine crud`

### Task 2.2: Criar rotas CRUD

**Files:**
- Create: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator.routes.test.ts`

- [x] Escrever testes Fastify para:
  - `GET /plugin-creator/blueprints`
  - `POST /plugin-creator/blueprints`
  - `GET /plugin-creator/blueprints/:id`
  - `PUT /plugin-creator/blueprints/:id`
  - 400 em body invalido
  - 404 em blueprint inexistente
- [x] Rodar teste e confirmar falha.
- [x] Implementar rotas usando `ApiResponse`.
- [x] Usar profile atual via `ProfileStore`/runtime existente.
- [x] Nao usar `PluginManager`.
- [x] Rodar teste e confirmar pass.
- [x] Commit: `feat: add plugin creator crud routes`

### Task 2.3: Registrar rotas no servidor

**Files:**
- Modify: `server/src/core/server.ts`
- Test: `server/src/core/routes/plugin-creator.routes.test.ts`

- [ ] Escrever teste que confirma rota registrada no app de teste ou atualizar fixture de servidor se existir.
- [ ] Rodar teste e confirmar falha.
- [ ] Importar e registrar `pluginCreatorRoutes`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: register plugin creator routes`

---

## Fase 3: Request Builder e Test Runner

### Task 3.1: Criar renderizador de request

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-request-template.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-request-template.test.ts`

- [ ] Escrever testes para:
  - renderizar `{{ params.userId }}` na URL
  - renderizar `{{ credentials.apiKey }}` em header
  - manter body JSON valido
  - falhar quando parametro obrigatorio nao existe
  - falhar para path fora de `params` e `credentials`
  - mascarar secrets quando retornar preview
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar parser simples e restrito.
- [ ] Nao usar `eval`, `Function`, VM ou JS livre.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: render plugin creator request templates`

### Task 3.2: Criar test runner HTTP

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-test-runner.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-test-runner.test.ts`

- [ ] Escrever testes com server HTTP local para:
  - GET retorna status, headers, body e duration
  - POST JSON envia body renderizado
  - erro de rede retorna erro estruturado
  - credentials sao mascaradas no request salvo
  - timeout encerra request
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar runner usando fetch nativo.
- [ ] Definir timeout default seguro.
- [ ] Salvar `tests/last-run.json` via repository.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator test runner`

### Task 3.3: Criar rota de test-method

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-test-method.routes.test.ts`

- [ ] Escrever testes para `POST /plugin-creator/blueprints/:id/test-method`.
- [ ] Validar payload com methodId, params e credentials de teste.
- [ ] Confirmar que blueprint inexistente retorna 404.
- [ ] Confirmar que secrets nao aparecem no response.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar endpoint chamando engine.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: expose plugin creator method testing`

---

## Fase 4: Mapping e Erros

### Task 4.1: Criar response mapper

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-response-mapper.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-response-mapper.test.ts`

- [ ] Escrever testes para:
  - extrair `body.data.id`
  - extrair array por path
  - retornar null quando path nao existe e campo nao requerido
  - falhar quando path requerido nao existe
  - inferir tipo basico para preview
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar mapper sem dependencias externas.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: map plugin creator responses`

### Task 4.2: Criar error mapper

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-error-mapper.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-error-mapper.test.ts`

- [ ] Escrever testes para:
  - `status == 401`
  - `status >= 500`
  - `body.success == false`
  - mensagem vinda de `body.error.message`
  - fallback sem regra retorna null
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar evaluator com operadores permitidos.
- [ ] Nao permitir expressao JS livre.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: map plugin creator errors`

### Task 4.3: Adicionar helpers de erro para codigo gerado

**Files:**
- Modify/Create conforme contrato encontrado do SDK.
- Test: `server/src/core/modules/plugin-creator/plugin-error-helper-contract.test.ts`

- [ ] Verificar se `@auvexis/sailor-sdk` ja exporta erro compativel.
- [ ] Escrever testes para:
  - `SailorPluginError` preserva `code`, `status`, `details`
  - `assertHttpOk` nao joga para 2xx
  - `assertHttpOk` joga erro mapeado para 401
  - `assertHttpOk` joga fallback para 5xx
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar helper usado pelo generator.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator error helpers`

---

## Fase 5: Code Generation

### Task 5.1: Gerar manifest SDK

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-manifest-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-manifest-generator.test.ts`

- [ ] Escrever testes para:
  - metadata vira manifest valido
  - inputs viram JSON Schema
  - credential API key vira auth schema
  - metadados `x-created-by`, `x-creator-version`, `x-editable-low-code`
  - manifest invalido falha antes de salvar
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar generator.
- [ ] Reusar validador existente em `server/src/core/modules/plugins/validator.ts` se aplicavel.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: generate plugin creator manifests`

### Task 5.2: Gerar methods.ts seguro

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-methods-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-methods-generator.test.ts`

- [ ] Escrever testes para:
  - gerar metodo HTTP GET
  - gerar metodo POST com JSON body
  - aplicar response mapping
  - aplicar error mapping
  - nao incluir codigo custom do usuario
  - output TypeScript contem imports esperados
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar generator por template controlado.
- [ ] Escapar strings via `JSON.stringify`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: generate plugin creator methods`

### Task 5.3: Gerar plugin completo

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-code-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-code-generator.test.ts`

- [ ] Escrever testes para gerar:
  - `manifest.json`
  - `methods.ts`
  - `index.ts`
  - `package.json`
  - `README.md`
  - assets
  - metadata creator
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar orquestrador.
- [ ] Gerar em `generated/`, nunca direto em `global/plugins`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: generate complete low code plugins`

### Task 5.4: Criar rota generate-preview

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-generate-preview.routes.test.ts`

- [ ] Escrever testes para `POST /plugin-creator/blueprints/:id/generate-preview`.
- [ ] Confirmar que retorna lista de arquivos e conteudo seguro.
- [ ] Confirmar que blueprint invalido retorna 400.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar endpoint.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: preview generated plugin creator files`

---

## Fase 6: Versionamento e Publish

### Task 6.1: Criar snapshot/version service

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-version-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-version-service.test.ts`

- [ ] Escrever testes para:
  - criar snapshot `manual-save`
  - criar snapshot `pre-publish`
  - criar snapshot `rollback-point`
  - manter limite de 50 snapshots comuns
  - nao apagar snapshot de publish automaticamente
  - rollback restaura blueprint
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar service.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: version plugin creator blueprints`

### Task 6.2: Integrar save com snapshot

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-save-snapshot.routes.test.ts`

- [ ] Escrever teste que `PUT /blueprints/:id` cria snapshot `manual-save`.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar integracao.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: snapshot plugin creator saves`

### Task 6.3: Criar publish service

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-publish-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-publish-service.test.ts`

- [ ] Escrever testes para:
  - validar blueprint antes de publicar
  - criar snapshot `pre-publish`
  - gerar arquivos em `generated/`
  - copiar release fixa para `releases/<version>/`
  - nao quebrar release anterior
  - bloquear sobrescrita de plugin customizado sem confirmacao
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar service.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: publish plugin creator releases`

### Task 6.4: Integrar release com Plugin Installer

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-publish-service.ts`
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-publish-installer-integration.test.ts`

- [ ] Escrever teste que release publicada pode ser instalada no perfil atual via fluxo existente.
- [ ] Confirmar que outros perfis nao recebem automaticamente.
- [ ] Confirmar que registry recarrega apos install.
- [ ] Rodar teste e confirmar falha.
- [ ] Integrar com `installExternalPlugin` ou caminho equivalente.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: install published plugin creator releases`

### Task 6.5: Criar rotas versions, rollback e publish

**Files:**
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-versioning.routes.test.ts`

- [ ] Escrever testes para:
  - `GET /plugin-creator/blueprints/:id/versions`
  - `POST /plugin-creator/blueprints/:id/rollback`
  - `POST /plugin-creator/blueprints/:id/publish`
  - 404 para blueprint inexistente
  - 400 para versao inexistente
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar rotas.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: expose plugin creator versioning`

---

## Fase 7: Export

### Task 7.1: Criar export service

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-export-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-export-service.test.ts`

- [ ] Escrever testes para:
  - export ZIP da release
  - export folder local com path permitido
  - bloquear path traversal
  - exportar plugin customizado sem sobrescrever codigo
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar ZIP com dependencia existente ou API Node disponivel.
- [ ] Se precisar de dependencia nova, justificar antes no commit.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: export plugin creator releases`

### Task 7.2: Criar rota export.zip

**Files:**
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-export.routes.test.ts`

- [ ] Escrever teste para `GET /plugin-creator/blueprints/:id/export.zip`.
- [ ] Confirmar content-type de ZIP.
- [ ] Confirmar erro quando nao existe release.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar rota.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: expose plugin creator zip export`

---

## Fase 8: Frontend Contrato Minimo

### Task 8.1: Criar tipos e API client

**Files:**
- Create: `client-vue/src/core/types/plugin-creator.types.ts`
- Create: `client-vue/src/core/api/plugin-creator.api.ts`
- Test: `client-vue/src/core/api/plugin-creator.api.contract.test.ts`

- [ ] Escrever testes de contrato para endpoints CRUD, test, preview, publish, versions e rollback.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar tipos espelhando response do backend.
- [ ] Implementar API client usando padrao de `client-vue/src/core/api/*.api.ts`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator client api`

### Task 8.2: Criar store Pinia

**Files:**
- Create: `client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts`
- Create: `client-vue/src/features/plugin-creator/stores/pluginCreatorHistory.store.ts`
- Test: `client-vue/src/features/plugin-creator/stores/pluginCreator.store.test.ts`

- [ ] Escrever testes para:
  - carregar blueprint
  - salvar draft
  - adicionar node
  - editar node
  - undo/redo
  - marcar dirty state
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar stores.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator stores`

### Task 8.3: Criar rota e pagina vazia funcional

**Files:**
- Create: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Create: `client-vue/src/features/plugin-creator/index.ts`
- Modify: `client-vue/src/app/router.ts`
- Test: `client-vue/src/app/router-plugin-creator.contract.test.ts`

- [ ] Escrever teste que `/plugin-creator` e `/plugin-creator/:pluginId` existem.
- [ ] Rodar teste e confirmar falha.
- [ ] Criar pagina com header e canvas placeholder.
- [ ] Nao usar `BaseModal.vue`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator route`

---

## Fase 9: Frontend Canvas e Cockpit

### Task 9.1: Criar header e command menu

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorHeader.vue`
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorCommandMenu.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorHeader.contract.test.ts`

- [ ] Escrever teste que menu contem:
  - New Plugin
  - Open Plugin
  - Import Plugin
  - Export ZIP
  - Export Folder
  - GitHub Export
  - Plugin Settings
  - Version History
  - Advanced Code
  - Discard Draft
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar menu com componentes existentes de dropdown.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator command menu`

### Task 9.2: Criar canvas VueFlow

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.contract.test.ts`

- [ ] Escrever teste que renderiza nodes e edges do blueprint.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar VueFlow com pan, zoom e select.
- [ ] Reusar estilo Sailor de canvas sem copiar logica do Workflow Editor.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator canvas`

### Task 9.3: Criar mini toolbar bottom

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorFloatingToolbar.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorFloatingToolbar.contract.test.ts`

- [ ] Escrever teste que toolbar contem:
  - Cursor/select
  - Pan tool
  - Delete tool
  - Clear Execution
  - Add Item/Node
  - Undo
  - Redo
  - Zoom slider
  - Run
  - Save
  - Publish
- [ ] Escrever teste que `Esc` volta para cursor/select.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar toolbar com icones lucide.
- [ ] Delete tool deve ter estado visual vermelho/claro.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator floating toolbar`

### Task 9.4: Criar Add Item panel

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.contract.test.ts`

- [ ] Escrever teste que painel lista:
  - Method
  - Input Field
  - Credential Field
  - Request
  - Header
  - Query Param
  - JSON Body
  - Response Mapper
  - Error Mapper
  - Output Field
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar painel lateral direito.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator item panel`

### Task 9.5: Criar nodes MVP

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/nodes/MethodNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/InputNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/CredentialNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/RequestNode.vue`
- Test: `client-vue/src/features/plugin-creator/components/nodes/pluginCreatorNodes.contract.test.ts`

- [ ] Escrever teste que cada node renderiza nome, handle e handles de conexao.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar nodes.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator mvp nodes`

### Task 9.6: Criar inspector

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorInspector.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorInspector.contract.test.ts`

- [ ] Escrever testes para editar:
  - metadata do plugin
  - metadata do metodo
  - input field
  - credential field
  - request URL/method/header/query/body
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar inspector usando inputs base existentes.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator inspector`

---

## Fase 10: Frontend Test Panel e Mapping

### Task 10.1: Criar Test Panel

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorTestPanel.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorTestPanel.contract.test.ts`

- [ ] Escrever teste que painel mostra:
  - inputs do metodo
  - credentials de teste
  - request final renderizada
  - response status
  - response headers
  - response body JSON tree
  - tempo da request
  - erro
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar painel chamando `testMethod`.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator test panel`

### Task 10.2: Criar nodes de mapper/output/error

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/nodes/ResponseMapperNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/ErrorMapperNode.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/OutputNode.vue`
- Test: `client-vue/src/features/plugin-creator/components/nodes/pluginCreatorMapperNodes.contract.test.ts`

- [ ] Escrever teste que nodes renderizam mappings.
- [ ] Escrever teste que acao "Map selected field as output" cria output.
- [ ] Escrever teste que acao "Create error rule from this response" cria regra.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar nodes e acoes.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator mapping nodes`

### Task 10.3: Criar Version Panel

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorVersionPanel.vue`
- Test: `client-vue/src/features/plugin-creator/components/PluginCreatorVersionPanel.contract.test.ts`

- [ ] Escrever teste que lista snapshots e releases.
- [ ] Escrever teste que rollback chama API correta.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar painel.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `feat: add plugin creator version panel`

---

## Fase 11: Hardening e Integracao

### Task 11.1: Teste de isolamento profile-scoped

**Files:**
- Test: `server/src/core/modules/plugin-creator/plugin-creator-profile-scope.integration.test.ts`

- [ ] Escrever teste com dois perfis:
  - perfil A cria blueprint
  - perfil B nao lista blueprint de A
  - publish em A nao instala em B automaticamente
  - export/import via installer e o caminho para B
- [ ] Rodar teste e confirmar falha se isolamento ainda nao cobrir caso.
- [ ] Ajustar repository/publish se necessario.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `test: cover plugin creator profile isolation`

### Task 11.2: Teste contra vazamento de secrets

**Files:**
- Test: `server/src/core/modules/plugin-creator/plugin-creator-secret-redaction.integration.test.ts`

- [ ] Escrever teste que usa credential `apiKey=secret-token`.
- [ ] Confirmar que `last-run.json` nao contem `secret-token`.
- [ ] Confirmar que response da rota test-method nao contem `secret-token`.
- [ ] Confirmar que snapshots nao contem credential de teste.
- [ ] Rodar teste e confirmar falha se houver vazamento.
- [ ] Ajustar mascaramento.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `test: prevent plugin creator secret leaks`

### Task 11.3: Teste contra codigo arbitrario

**Files:**
- Test: `server/src/core/modules/plugin-creator/plugin-creator-code-safety.test.ts`

- [ ] Escrever teste com input malicioso tentando inserir `process.exit`.
- [ ] Escrever teste com template tentando acessar `constructor.constructor`.
- [ ] Confirmar generator escapa strings.
- [ ] Confirmar template renderer rejeita paths invalidos.
- [ ] Rodar teste e confirmar falha se inseguro.
- [ ] Ajustar generator/renderer.
- [ ] Rodar teste e confirmar pass.
- [ ] Commit: `test: harden plugin creator code generation`

### Task 11.4: Build backend

- [ ] Rodar `cd server; npm run build`.
- [ ] Corrigir erros de typecheck.
- [ ] Rodar novamente ate passar.
- [ ] Commit: `chore: fix plugin creator server build`

### Task 11.5: Build frontend

- [ ] Rodar `cd client-vue; npm run build`.
- [ ] Corrigir erros de typecheck/build.
- [ ] Rodar novamente ate passar.
- [ ] Commit: `chore: fix plugin creator client build`

### Task 11.6: Smoke manual

- [ ] Subir server.
- [ ] Subir client.
- [ ] Abrir `/plugin-creator`.
- [ ] Criar plugin simples.
- [ ] Criar metodo GET publico.
- [ ] Rodar teste.
- [ ] Mapear output.
- [ ] Gerar preview.
- [ ] Publicar.
- [ ] Instalar no perfil atual.
- [ ] Confirmar plugin aparece no Workflow Editor.
- [ ] Confirmar draft quebrado nao quebra plugin publicado.
- [ ] Commit: nao precisa se nao houver mudanca.

---

## Ordem Recomendada de Execucao

- [ ] Fase 0: levantamento.
- [ ] Fase 1: contrato e blueprint backend.
- [ ] Fase 2: CRUD backend.
- [ ] Fase 3: request builder e test runner.
- [ ] Fase 4: mapping e erros.
- [ ] Fase 5: code generation.
- [ ] Fase 6: versionamento e publish.
- [ ] Fase 7: export.
- [ ] Fase 8: frontend contrato minimo.
- [ ] Fase 9: canvas e cockpit.
- [ ] Fase 10: test panel e mapping UI.
- [ ] Fase 11: hardening, builds e smoke.

## Definition of Done

- [ ] Todos os testes backend focados passam.
- [ ] `cd server; npm run build` passa.
- [ ] Testes de contrato frontend passam.
- [ ] `cd client-vue; npm run build` passa.
- [ ] Blueprint e drafts ficam somente no perfil ativo.
- [ ] Publish gera release fixa e instalavel.
- [ ] Draft quebrado nao afeta workflow existente.
- [ ] Secrets mascarados em last-run, rota e logs.
- [ ] Codigo gerado nao aceita JS livre.
- [ ] Plugin gerado segue SDK e aparece no Workflow Editor apos install.
