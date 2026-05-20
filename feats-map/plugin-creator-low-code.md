# Plugin Creator Low-Code

## Objetivo

Criar uma rota propria para o usuario montar plugins reais do Sailor SDK usando uma experiencia visual low-code, focada em testar APIs externas e transformar requests em metodos de plugin usaveis no Workflow Editor.

## Decisao de Produto

O Plugin Creator nao deve tentar substituir desenvolvimento avancado.

Ele deve resolver bem:
- criar plugin simples sem escrever codigo;
- testar APIs externas sem precisar de Postman;
- criar metodos HTTP com inputs, credentials, URL, headers, query e body;
- mapear response body para output do metodo;
- mapear erros conhecidos para exceptions;
- salvar/publicar plugin como plugin real do Sailor SDK;
- exportar o plugin para evoluir manualmente depois.

Ele nao deve resolver no MVP:
- logica custom complexa em JS livre;
- triggers avancados;
- websocket;
- OAuth2 complexo;
- dependencias externas arbitrarias;
- transformacoes complexas de dados.

Para esses casos, o usuario baixa/exporta o plugin gerado e continua no codigo, ou usa o futuro `sailor-cli` para criar um plugin advanced.

## Experiencia

### Rota

Criar uma rota dedicada:

- `/plugin-creator`
- depois pode aceitar `/plugin-creator/:pluginId`

Nao usar `BaseModal.vue`.

Motivo:
- a feature precisa de workspace inteiro;
- o canvas precisa respirar;
- teste de request e response precisa de painel proprio;
- modal deixaria a experiencia pequena e confusa.

### UI Geral

Manter a estetica Sailor de canvas/nodes/blocos, mas com cockpit diferente do Workflow Editor.

Regra:

> Canvas igual, cockpit diferente.

Consistente com Workflow Editor:
- blocos/nodes;
- handles;
- conexoes;
- pan/zoom/select;
- inspector lateral;
- painel de adicionar itens;
- estilo visual Sailor.

Diferente do Workflow Editor:
- topbar mais leve;
- menu principal em dropdown;
- mini toolbar flutuante no bottom;
- painel de teste/API response;
- foco em plugin/metodo/API, nao em automacao.

### Mini Toolbar Bottom

Toolbar flutuante no bottom do Plugin Creator:

1. Cursor/select
2. Pan tool
3. Delete tool
4. Clear Execution
5. Add Item/Node
6. Undo
7. Redo
8. Zoom slider
9. Run
10. Save
11. Publish

Separadores:

- tools: cursor, pan, delete, clear, add
- history/view: undo, redo, zoom
- lifecycle: run, save, publish

Cuidados:
- delete tool precisa de visual vermelho/claro;
- `Esc` volta para cursor/select;
- acoes criticas como Save, Run e Publish devem ficar visiveis;
- dropdown fica para acoes menos frequentes.

### Dropdown Principal

No header, usar um botao/menu com opcoes:

- New Plugin
- Open Plugin
- Import Plugin
- Export ZIP
- Export Folder
- GitHub Export futuro
- Plugin Settings
- Version History
- Advanced Code
- Discard Draft

### Canvas

Todos os metodos ficam no mesmo canvas, igual multiplos triggers no Workflow Editor.

Cada metodo vira um cluster visual:

```text
[Method: Create Lead]
  [Inputs] -> [Request] -> [Response Mapper] -> [Output]
                         -> [Error Mapper]
```

Outro metodo no mesmo canvas:

```text
[Method: Get Lead]
  [Inputs] -> [Request] -> [Response Mapper] -> [Output]
```

Isso transforma o plugin em um mapa visual de capacidades.

### Add Item/Node Panel

Quando clicar em Add Item/Node, abrir painel lateral direito parecido com Add Node do Workflow Editor.

Itens do MVP:
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
- Note/Group depois

## Fluxo Principal

1. Usuario cria plugin:
   - handle;
   - nome;
   - descricao;
   - icon;
   - iconDark;
   - iconLight.

2. Usuario cria metodo:
   - handle do metodo;
   - nome;
   - descricao;
   - categoria opcional.

3. Usuario cria inputs:
   - nome;
   - tipo;
   - required;
   - default;
   - placeholder;
   - description.

4. Usuario cria credentials:
   - API key header;
   - Bearer token;
   - Basic auth;
   - sem auth.

5. Usuario monta request:
   - method HTTP;
   - URL;
   - headers;
   - query;
   - body.

6. Usuario arrasta inputs/credentials para URL/header/body:
   - `{{ params.userId }}`
   - `{{ credentials.apiKey }}`

7. Usuario roda teste:
   - preenche valores dos inputs;
   - escolhe credentials de teste;
   - ve request renderizada;
   - ve status;
   - ve headers;
   - ve response body;
   - ve tempo;
   - ve erro se falhar.

8. Usuario mapeia output:
   - seleciona caminhos do response body;
   - define nomes de output;
   - define tipo do output.

9. Usuario mapeia erros:
   - condicao por status code;
   - condicao por body path;
   - mensagem fixa ou vinda do response;
   - codigo de erro.

10. Usuario salva draft.

11. Usuario publica plugin.

12. Plugin aparece no sistema como plugin real SDK.

## Tipos de Input

Suportar no MVP:

- string
- number
- boolean
- object
- array
- select
- file, se o executor atual suportar bem no plugin manifest

Cada input vira JSON Schema dentro do `manifest.json`.

## Error Mapping

Adicionar helper no Sailor SDK:

```ts
throw new SailorPluginError("Credenciais invalidas", {
  code: "INVALID_CREDENTIALS",
  status: 401,
  details: response.body,
});
```

Tambem criar helpers de HTTP:

```ts
assertHttpOk(response, {
  401: "Credenciais invalidas",
  404: "Recurso nao encontrado",
  500: "API externa indisponivel",
});
```

No Plugin Creator, o usuario cria regras visuais:

- se `status == 401`, jogar `INVALID_CREDENTIALS`;
- se `status >= 500`, jogar `EXTERNAL_API_UNAVAILABLE`;
- se `response.body.success == false`, jogar mensagem de `response.body.message`;
- se `response.body.error.message` existir, jogar essa mensagem.

O codigo gerado usa os helpers do SDK.

## Arquitetura Backend

Criar engine nova, separada de WorkflowEngine.

Nome sugerido:

- `PluginCreatorEngine`

Modulos sugeridos:

- `server/src/core/modules/plugin-creator/plugin-creator-engine.ts`
- `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- `server/src/core/modules/plugin-creator/plugin-blueprint-repository.ts`
- `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- `server/src/core/modules/plugin-creator/plugin-scaffold-service.ts`
- `server/src/core/modules/plugin-creator/plugin-code-generator.ts`
- `server/src/core/modules/plugin-creator/plugin-manifest-generator.ts`
- `server/src/core/modules/plugin-creator/plugin-methods-generator.ts`
- `server/src/core/modules/plugin-creator/plugin-test-runner.ts`
- `server/src/core/modules/plugin-creator/plugin-version-service.ts`
- `server/src/core/modules/plugin-creator/plugin-publish-service.ts`
- `server/src/core/routes/plugin-creator.routes.ts`

Regra:
- nao misturar com WorkflowEngine;
- nao colocar regra de criacao visual dentro de PluginManager;
- nao fazer plugin chamar core;
- pode reaproveitar tipos shared, validadores, Vault, loader/installer externo e SDK contract.

## Modelo Interno

O Plugin Creator deve salvar um blueprint proprio.

Exemplo conceitual:

```json
{
  "id": "plugin_creator_x",
  "metadata": {
    "handle": "my-crm",
    "name": "My CRM",
    "version": "0.1.0",
    "description": "CRM API connector"
  },
  "icons": {
    "icon": "icon.svg",
    "iconDark": "icon-dark.svg",
    "iconLight": "icon-light.svg"
  },
  "auth": {
    "type": "apiKey",
    "fields": [
      {
        "name": "apiKey",
        "label": "API Key",
        "target": "header",
        "headerName": "Authorization",
        "prefix": "Bearer "
      }
    ]
  },
  "methods": [
    {
      "id": "method_create_lead",
      "handle": "createLead",
      "name": "Create Lead",
      "inputs": [],
      "request": {},
      "responseMapping": [],
      "errorMapping": []
    }
  ],
  "canvas": {
    "nodes": {},
    "edges": []
  }
}
```

O blueprint e a fonte da verdade do editor.

O `manifest.json` e `methods.ts` sao gerados a partir dele.

## Codigo Gerado

Gerar plugin SDK real:

- `manifest.json`
- `methods.ts`
- `index.ts`
- `package.json`
- `package-lock.json`, se necessario
- assets de icone
- `README.md`
- metadados do creator

Adicionar metadados:

```json
{
  "x-created-by": "sailor-plugin-creator",
  "x-creator-version": "1.0.0",
  "x-editable-low-code": true
}
```

Se usuario editar manualmente fora do Creator:
- continuar deixando instalar;
- mostrar aviso: "Plugin customizado. Edicao visual limitada.";
- permitir exportar;
- evitar sobrescrever codigo custom sem confirmacao.

## Versionamento

Criar versionamento desde o inicio.

Modelo:

- draft atual;
- snapshots salvos;
- published versions;
- rollback.

Comportamento:
- Save atualiza draft;
- Publish cria versao fixa;
- Rollback restaura blueprint e arquivos de uma versao;
- Duplicate Version permite testar sem quebrar plugin publicado.

Importante:
- workflows devem usar versao publicada/instalada;
- draft quebrado nao pode quebrar automacoes existentes.

## Persistencia

Sugestao:

- Blueprints ficam no perfil onde foram criados.
- Arquivos gerados ficam em pasta controlada do Sailor.
- Publicacao gera um pacote/plugin instalavel a partir do perfil atual.
- O plugin criado no perfil X nao aparece automaticamente em outros perfis.
- Para usar em outro perfil, o usuario precisa instalar/exportar esse plugin pelo Plugin Installer existente.

O Sailor ja resolve a pasta base por plataforma em `server/src/core/runtime/sailor-home.ts`:

- Windows: `%AppData%/Sailor`
- macOS: `~/Library/Application Support/Sailor`
- Linux: `~/.config/sailor`

O Plugin Creator deve criar sua propria pasta dentro do perfil ativo, usando `resolveProfilePaths`.
Nao salvar blueprint em `global/`, porque blueprint e draft pertencem ao perfil.

Possivel estrutura:

```text
sailor-home/
  profiles/
    <profile-id>/
      plugin-creator/
        blueprints/
          <blueprint-id>/
            blueprint.json
            assets/
              icon.svg
              icon-dark.svg
              icon-light.svg
            generated/
              manifest.json
              methods.ts
              index.ts
              package.json
            tests/
              last-run.json
            snapshots/
              <snapshot-id>.json
            releases/
              <version>/
                manifest.json
                methods.ts
                index.ts
                package.json
                package-lock.json
                README.md
                assets/
            exports/
              <version>.zip
  global/
    plugins/
      <install-id>/
```

Regra importante:

> Plugin Creator e profile-scoped. Plugin Installer e o caminho oficial para compartilhar entre perfis.

Isso evita vazamento entre perfis e reaproveita a logica atual de instalacao de plugins externos.

### Snapshots

Snapshots devem salvar somente o blueprint e metadados pequenos, nao duplicar release inteira.

Snapshot sugerido:

```json
{
  "id": "snap_...",
  "blueprintId": "bp_...",
  "createdAt": "2026-05-20T00:00:00.000Z",
  "reason": "manual-save",
  "version": "0.1.0",
  "blueprint": {}
}
```

Tipos de snapshot:

- `manual-save`: criado quando usuario salva;
- `pre-publish`: criado antes de publicar;
- `rollback-point`: criado antes de restaurar versao antiga;
- `autosave`, se autosave entrar depois.

Manter limite por blueprint:

- 50 snapshots recentes por plugin criado;
- snapshots de publish nao devem ser apagados automaticamente.

### Releases

Release e diferente de snapshot.

- snapshot: estado editavel do blueprint;
- release: plugin SDK gerado e instalavel.

Ao publicar:

1. validar blueprint;
2. gerar arquivos em `generated/`;
3. copiar release fixa para `releases/<version>/`;
4. criar snapshot `pre-publish`;
5. disponibilizar release para Plugin Installer.

### Last Run

Salvar ultimo teste em:

```text
tests/last-run.json
```

Esse arquivo deve guardar:

- metodo testado;
- request renderizada;
- status;
- headers;
- body;
- tempo;
- erro;
- timestamp.

Nao salvar secrets em claro no `last-run.json`.
Campos vindos de credentials devem ser mascarados.

## Rotas Backend

MVP:

- `GET /plugin-creator/blueprints`
- `POST /plugin-creator/blueprints`
- `GET /plugin-creator/blueprints/:id`
- `PUT /plugin-creator/blueprints/:id`
- `POST /plugin-creator/blueprints/:id/test-method`
- `POST /plugin-creator/blueprints/:id/generate-preview`
- `POST /plugin-creator/blueprints/:id/publish`
- `GET /plugin-creator/blueprints/:id/versions`
- `POST /plugin-creator/blueprints/:id/rollback`
- `GET /plugin-creator/blueprints/:id/export.zip`

Depois:

- GitHub export;
- folder export;
- advanced code unlock;
- import blueprint.

## Frontend

Criar feature separada:

- `client-vue/src/features/plugin-creator/`

Componentes sugeridos:

- `PluginCreatorPage.vue`
- `PluginCreatorCanvas.vue`
- `PluginCreatorHeader.vue`
- `PluginCreatorCommandMenu.vue`
- `PluginCreatorFloatingToolbar.vue`
- `PluginCreatorAddItemPanel.vue`
- `PluginCreatorInspector.vue`
- `PluginCreatorTestPanel.vue`
- `PluginCreatorVersionPanel.vue`
- `PluginCreatorNode.vue`
- `nodes/MethodNode.vue`
- `nodes/InputNode.vue`
- `nodes/CredentialNode.vue`
- `nodes/RequestNode.vue`
- `nodes/HeaderNode.vue`
- `nodes/QueryNode.vue`
- `nodes/BodyNode.vue`
- `nodes/ResponseMapperNode.vue`
- `nodes/ErrorMapperNode.vue`
- `nodes/OutputNode.vue`

Stores:

- `pluginCreator.store.ts`
- `pluginCreatorHistory.store.ts`, se undo/redo ficar separado.

API:

- `client-vue/src/core/api/plugin-creator.api.ts`
- tipos em `client-vue/src/core/types/plugin-creator.types.ts`

Router:

- adicionar rota `/plugin-creator`
- link na area de plugins.

## UX de Teste de API

Painel de teste deve mostrar:

- inputs do metodo;
- credentials de teste;
- request final renderizada;
- response status;
- response headers;
- response body com JSON tree;
- tempo da request;
- botao "Map selected field as output";
- botao "Create error rule from this response".

Isso faz o Sailor substituir parte do Postman.

## Fases

### Fase 1: Base e Blueprint

- criar tipos shared do blueprint;
- criar repository;
- criar rotas CRUD;
- criar page vazia com header/canvas;
- salvar draft.

### Fase 2: Canvas e Nodes Basicos

- criar canvas VueFlow;
- criar mini toolbar;
- criar Add Item panel;
- criar Method/Input/Credential/Request nodes;
- criar inspector.

### Fase 3: Request Builder e Test Runner

- montar request com `{{ params.* }}` e `{{ credentials.* }}`;
- executar teste no backend;
- retornar status/headers/body/time;
- mostrar response no Test Panel.

### Fase 4: Mapping

- response mapper;
- output schema;
- error mapper;
- helper de erro no SDK;
- gerar exceptions.

### Fase 5: Code Generation

- gerar `manifest.json`;
- gerar `methods.ts`;
- gerar `index.ts`;
- validar manifest com SDK;
- preview de arquivos gerados.

### Fase 6: Publish e Versioning

- save draft;
- publish version;
- rollback;
- gerar release instalavel do plugin criado no perfil atual;
- permitir instalar no perfil atual via fluxo do Plugin Installer;
- para outros perfis, exportar/instalar pelo Plugin Installer existente;
- recarregar registry do perfil alvo;
- plugin aparece no Workflow Editor do perfil onde foi instalado.

### Fase 7: Export

- export ZIP;
- export folder local;
- GitHub export depois.

## Testes

Backend:

- blueprint validation;
- repository;
- request renderer;
- test runner;
- response mapper;
- error mapper;
- manifest generator;
- methods generator;
- publish/version rollback;
- install/reload integration.

Frontend:

- route existe;
- toolbar tem ferramentas certas;
- Add Item abre painel;
- nodes aparecem no canvas;
- inspector edita blueprint;
- run mostra response;
- mapper cria output;
- version panel lista rollback.

Build:

- `npm run build` no server;
- testes focados no server;
- testes contract do client;
- build do client.

## Riscos

1. Gerar JS arbitrario perigoso.
   - Solucao: gerar codigo a partir de blueprint validado.

2. Plugin draft quebrar workflow existente.
   - Solucao: workflow usa publicado; draft fica isolado.

3. Plugin criado em um perfil vazar para outros perfis.
   - Solucao: blueprint fica profile-scoped; outros perfis usam Plugin Installer.

4. UI visual ficar mais dificil que formulario.
   - Solucao: metodo nasce com flow padrao pronto.

5. Engine ficar acoplada ao Workflow Editor.
   - Solucao: feature separada, engine separada, shared types claros.

6. Sobrescrever plugin customizado.
   - Solucao: detectar `x-editable-low-code` e mudancas manuais.

## Ordem Recomendada de Execucao

- [ ] Criar tipos e repository do blueprint.
- [ ] Criar rotas CRUD do Plugin Creator.
- [ ] Criar rota/page `/plugin-creator`.
- [ ] Criar canvas basico com toolbar bottom.
- [ ] Criar Add Item panel.
- [ ] Criar nodes MVP: Method, Input, Credential, Request.
- [ ] Criar inspector para editar nodes.
- [ ] Criar renderizador de request.
- [ ] Criar test runner backend.
- [ ] Criar Test Panel frontend.
- [ ] Criar response mapper.
- [ ] Criar error mapper.
- [ ] Adicionar `SailorPluginError` e helpers no SDK.
- [ ] Criar manifest generator.
- [ ] Criar methods generator.
- [ ] Criar publish service.
- [ ] Criar version service.
- [ ] Gerar release instalavel e integrar com Plugin Installer existente.
- [ ] Adicionar export ZIP.
- [ ] Rodar testes e builds.
- [ ] Revisar UX final no browser.
