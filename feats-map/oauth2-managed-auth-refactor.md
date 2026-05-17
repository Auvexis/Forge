# OAuth2 Managed Auth Refactor Plan

Goal: refatorar OAuth2 no Sailor para um contrato generico, previsivel e extensivel, sem presets por provider, cobrindo a maioria dos OAuth2 reais e mantendo `defineCustomAuth` para casos fora do padrao.

Principios:
- Core nao conhece Spotify, Google, Slack ou qualquer provider especifico.
- Plugin declara contrato. Core executa protocolo.
- Plugin nao chama core, nao conhece engine, nao acessa nada fora da pasta.
- Fluxo default deixa de usar mini janela/popup e passa a abrir uma nova aba normal.
- TDD antes de cada task de feature.
- Cada task concluida deve ser marcada neste arquivo e commitada.

## Arquitetura Alvo

### Auth declarativo

Plugins comuns usam:

```ts
auth: defineOAuth2Auth({
  credentialSchema: {
    clientId: {
      type: "string",
      inputType: "text",
      label: "Client ID",
      required: true,
    },
    clientSecret: {
      type: "string",
      inputType: "password",
      label: "Client Secret",
      required: true,
    },
  },
  authorization: {
    url: "https://example.com/oauth/authorize",
    method: "GET",
    responseType: "code",
    extraParams: {
      audience: "https://api.example.com",
    },
    scope: {
      values: ["read:user", "write:user"],
      paramName: "scope",
      separator: " ",
    },
    pkce: {
      enabled: true,
      method: "S256",
    },
  },
  token: {
    url: "https://example.com/oauth/token",
    method: "POST",
    contentType: "form",
    clientAuth: {
      method: "basic",
      clientIdField: "clientId",
      clientSecretField: "clientSecret",
    },
    exchangeParams: {
      grant_type: "authorization_code",
    },
    refreshParams: {
      grant_type: "refresh_token",
    },
    responseMapping: {
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresIn: "expires_in",
      tokenType: "token_type",
      scope: "scope",
    },
  },
  testConnection: {
    url: "https://example.com/me",
    method: "GET",
    auth: "bearer",
  },
  ui: {
    buttonText: "Connect",
    buttonIcon: "plug",
    oauthCallbackInstructions: "Add this redirect URL in the external app.",
  },
})
```

### Auth customizado

Casos especiais usam:

```ts
auth: defineCustomAuth({
  type: "oauth2",
  credentialSchema: {},
  getAuthUrl(ctx) {},
  exchangeCode(ctx) {},
  refreshTokens(ctx) {},
})
```

`defineCustomAuth` e explicitamente avancado. O caminho padrao e declarativo.

### Fluxo frontend

1. Usuario clica Connect.
2. Frontend chama `POST /plugins/:pluginId/auth/connect`.
3. Backend cria `state`, PKCE quando necessario, salva auth session curta.
4. Frontend abre `window.open(url, "_blank", "noopener,noreferrer")` sem dimensoes de popup.
5. Provider redireciona para backend callback.
6. Backend troca code, salva tokens e renderiza pagina HTML de resultado.
7. Usuario fecha a aba ou volta para o Sailor.
8. Frontend revalida status em `visibilitychange`, `focus`, e por botao "Check connection".

Sem `postMessage`. Sem `window.close`. Sem polling de janela.

## Tasks

### Task 1 - Definir contrato no SDK / tipos compartilhados

Files:
- Modify: `server/src/shared/models/plugin-types.ts`
- Modify: pacote SDK usado por plugins, se os tipos estiverem em outro repo/pacote local
- Modify: `sailor-cli/src/templates/plugin/files.js`
- Test: testes de validacao do manifest/auth no server e CLI

Steps:
- [ ] Escrever teste falhando para aceitar `auth.type = "oauth2"` com config declarativa.
- [ ] Escrever teste falhando para rejeitar OAuth2 declarativo sem `authorization.url`.
- [ ] Escrever teste falhando para rejeitar `token.clientAuth.method` desconhecido.
- [ ] Criar tipos:
  - `OAuth2DeclarativeAuth`
  - `OAuth2AuthorizationConfig`
  - `OAuth2TokenConfig`
  - `OAuth2ClientAuthConfig`
  - `OAuth2ScopeConfig`
  - `OAuth2PkceConfig`
  - `OAuth2ResponseMapping`
  - `CustomOAuth2Auth`
- [ ] Criar helper `defineOAuth2Auth(config)`.
- [ ] Criar helper `defineCustomAuth(config)`.
- [ ] Garantir compatibilidade temporaria com OAuth2 legado baseado em funcoes.
- [ ] Rodar testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server sailor-cli
git commit -m "feat(auth): add declarative oauth2 contract"
```

### Task 2 - Criar OAuth2Service no core

Files:
- Create: `server/src/core/modules/plugins/auth/oauth2-service.ts`
- Create: `server/src/core/modules/plugins/auth/oauth2-service.test.ts`
- Create: `server/src/core/modules/plugins/auth/oauth2-types.ts`
- Modify: `server/src/core/modules/plugins/manager.ts`
- Modify: `server/src/core/modules/plugins/vault.ts`

Steps:
- [x] Escrever teste para gerar authorization URL com `client_id`, `redirect_uri`, `response_type`, `scope` e parametros extras.
- [x] Escrever teste para `clientAuth.method = "basic"` gerar header `Authorization: Basic ...`.
- [x] Escrever teste para `clientAuth.method = "body"` enviar `client_id` e `client_secret` no body.
- [x] Escrever teste para `clientAuth.method = "none"` nao enviar segredo.
- [x] Escrever teste para PKCE S256 gerar `code_verifier` e `code_challenge`.
- [x] Escrever teste para mapear resposta de token com `responseMapping`.
- [x] Implementar `OAuth2Service.createAuthorizationUrl`.
- [x] Implementar `OAuth2Service.exchangeCode`.
- [x] Implementar `OAuth2Service.refreshTokens`.
- [x] Implementar parser de erro para JSON, form encoded e texto puro.
- [x] Rodar testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src/core/modules/plugins/auth server/src/core/modules/plugins/manager.ts server/src/core/modules/plugins/vault.ts
git commit -m "feat(auth): add managed oauth2 service"
```

### Task 3 - Persistir state e PKCE com expiracao curta

Files:
- Create: `server/src/core/modules/plugins/auth/oauth2-session-store.ts`
- Create: `server/src/core/modules/plugins/auth/oauth2-session-store.test.ts`
- Modify: `server/src/core/database/migrations/credentials/*`
- Modify: `server/src/core/database/manager.test.ts`

Steps:
- [x] Escrever migration para tabela `oauth2_auth_sessions`.
- [ ] Campos: `state`, `plugin_id`, `redirect_uri`, `code_verifier`, `created_at`, `expires_at`.
- [x] Escrever teste para salvar e consumir uma session por `state`.
- [x] Escrever teste para impedir reuso de `state`.
- [x] Escrever teste para ignorar session expirada.
- [x] Implementar store.
- [x] Integrar migration.
- [x] Rodar testes de database e store.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src/core/database server/src/core/modules/plugins/auth
git commit -m "feat(auth): persist oauth2 authorization sessions"
```

### Task 4 - Refatorar rotas OAuth para usar o service

Files:
- Modify: `server/src/core/routes/plugins.routes.ts`
- Create: `server/src/core/routes/plugins-oauth.routes.test.ts` ou teste equivalente existente
- Modify: `server/src/core/modules/command-palette/providers/plugins.commands.ts`

Steps:
- [ ] Escrever teste para `POST /plugins/:id/auth/connect` retornar URL gerada pelo `OAuth2Service`.
- [ ] Escrever teste para bloquear connect quando Public URL for local.
- [ ] Escrever teste para callback com `state` invalido retornar pagina de erro.
- [ ] Escrever teste para callback com `code` valido salvar tokens.
- [ ] Escrever teste para callback com erro do provider renderizar pagina de erro clara.
- [x] Substituir chamada direta `provider.getAuthUrl`.
- [x] Substituir chamada direta `provider.exchangeCode`.
- [x] Manter branch legacy para plugins antigos com funcoes.
- [x] Remover `postMessage` e `window.close` do HTML de callback.
- [x] Renderizar pagina simples de sucesso/erro com titulo, mensagem e instrucao para voltar ao Sailor.
- [x] Rodar testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src/core/routes server/src/core/modules/command-palette/providers
git commit -m "refactor(auth): route oauth2 through managed service"
```

### Task 5 - Refatorar refresh automatico no executor

Files:
- Modify: `server/src/core/modules/plugins/executor.ts`
- Create/Modify: `server/src/core/modules/plugins/executor.test.ts`

Steps:
- [x] Escrever teste para plugin declarativo com token expirado chamar `OAuth2Service.refreshTokens`.
- [x] Escrever teste para plugin legacy continuar usando `provider.refreshTokens`.
- [x] Escrever teste para erro de refresh retornar erro acionavel.
- [x] Atualizar executor para resolver tokens via helper unico.
- [x] Garantir que contexto dos metodos continue recebendo `tokens` e `credentials`.
- [x] Rodar testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src/core/modules/plugins/executor.ts server/src/core/modules/plugins/executor.test.ts
git commit -m "refactor(auth): centralize oauth2 token refresh"
```

### Task 6 - Refatorar frontend para aba normal e revalidacao de status

Files:
- Modify: `client-vue/src/shared/composables/usePluginAuth.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue`
- Modify: `client-vue/src/shared/components/layout/AppGlobalSettings.vue`
- Create/Modify: testes contract do auth UI, se existentes

Steps:
- [ ] Escrever teste/composable test para `handleConnect` abrir `_blank` sem features de popup.
- [ ] Escrever teste para remover listener `message`.
- [ ] Escrever teste para recarregar status em `window.focus`.
- [ ] Escrever teste para recarregar status quando `document.visibilityState === "visible"`.
- [x] Alterar `window.open(data.url, "_blank", "noopener,noreferrer")`.
- [x] Remover polling de `win.closed`.
- [x] Remover `postMessage` listener.
- [x] Adicionar estado "Waiting for authorization. Return here after finishing in the new tab."
- [x] Adicionar botao "Check connection".
- [x] Rodar `npm run type-check`.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add client-vue/src/shared/composables/usePluginAuth.ts client-vue/src/features/workflow-editor client-vue/src/shared/components/layout
git commit -m "refactor(auth): use browser tab oauth flow"
```

### Task 7 - Atualizar CLI templates para OAuth declarativo

Files:
- Modify: `sailor-cli/src/templates/plugin/files.js`
- Modify: `sailor-cli/test/create-plugin-project.test.js`
- Modify: README gerado pelo template

Steps:
- [ ] Escrever teste falhando para template Spotify usar `defineOAuth2Auth`.
- [ ] Escrever teste falhando para template nao conter `exchangeCode`.
- [ ] Escrever teste falhando para README explicar o fluxo declarativo.
- [ ] Atualizar template Spotify.
- [ ] Atualizar comentarios para explicar manifest/auth sem parecer texto gerado por IA.
- [ ] Manter exemplo simples e legivel.
- [ ] Rodar `npm test`.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add sailor-cli/src/templates sailor-cli/test
git commit -m "refactor(cli): generate declarative oauth2 plugins"
```

### Task 8 - Melhorar erros e status OAuth no frontend

Files:
- Modify: `client-vue/src/core/types/plugin.types.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue`
- Modify: `client-vue/src/shared/components/layout/AppGlobalSettings.vue`
- Modify: `server/src/core/routes/plugins.routes.ts`

Steps:
- [ ] Escrever teste para status retornar checklist OAuth:
  - `publicUrlReady`
  - `credentialsReady`
  - `redirectUri`
  - `connected`
  - `lastError`
- [ ] Escrever teste UI para mostrar erro de callback salvo.
- [ ] Backend deve salvar ultimo erro OAuth por plugin em tabela ou store persistente.
- [ ] UI deve mostrar erro acionavel sem esconder redirect URL.
- [ ] Botao Connect deve estar disabled quando Public URL nao estiver pronta.
- [ ] Rodar type-check e testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src client-vue/src
git commit -m "feat(auth): expose oauth2 readiness and errors"
```

### Task 9 - Compatibilidade e migracao legacy

Files:
- Modify: `server/src/core/modules/plugins/loader.ts`
- Modify: `server/src/core/modules/plugins/validator.ts`
- Modify: `server/src/core/modules/plugins/auth/oauth2-service.ts`
- Create: `server/src/core/modules/plugins/auth/oauth2-legacy-adapter.ts`
- Create: tests para legacy adapter

Steps:
- [ ] Escrever teste para plugin antigo com `getAuthUrl/exchangeCode` continuar funcionando.
- [ ] Escrever teste para logar warning uma vez por plugin legacy.
- [ ] Implementar `OAuth2LegacyAdapter`.
- [ ] Status deve indicar `auth_mode: "legacy_oauth2"` para debug.
- [ ] Documentar que legacy sera removido depois.
- [ ] Rodar testes.
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add server/src/core/modules/plugins
git commit -m "feat(auth): support legacy oauth2 adapter"
```

### Task 10 - Documentacao e DX final

Files:
- Create/Modify: docs de plugin OAuth, se existir pasta docs
- Modify: `sailor-cli` README gerado
- Modify: `server/src/plugins/_template` se ainda existir template interno

Steps:
- [ ] Criar doc curta: "OAuth2 in Sailor plugins".
- [ ] Explicar quando usar `defineOAuth2Auth`.
- [ ] Explicar quando usar `defineCustomAuth`.
- [ ] Incluir exemplo de `basic`, `body`, `none`, PKCE e params extras.
- [ ] Incluir troubleshooting:
  - Public URL local
  - redirect URI mismatch
  - missing refresh token
  - invalid client
  - masked secret
- [ ] Rodar verificacoes finais:
  - `npm run build` no server
  - `npm run type-check` no client
  - `npm test` no sailor-cli
- [ ] Marcar task concluida e commit.

Expected commit:

```bash
git add docs sailor-cli server
git commit -m "docs(auth): document generic oauth2 plugin flow"
```

## Acceptance Criteria

- Plugin comum nao precisa escrever `getAuthUrl`, `exchangeCode`, `refreshTokens`.
- Core nao tem presets nem conhecimento de providers especificos.
- OAuth2 declarativo cobre:
  - auth code
  - PKCE S256
  - client auth basic/body/none
  - scopes com separador configuravel
  - params extras em authorization/token/refresh
  - response mapping
  - erro legivel
- `defineCustomAuth` existe para excecoes reais.
- Frontend nao usa popup pequeno, `postMessage`, `window.close` ou polling de janela.
- Callback renderiza pagina final clara no backend.
- Frontend revalida status ao voltar para a aba Sailor.
- Secrets mascarados nunca sobrescrevem secrets reais.
- Plugins legacy continuam funcionando durante migracao.
