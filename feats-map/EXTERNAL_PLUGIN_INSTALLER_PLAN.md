# External Plugin Installer Plan

## Objetivo

Criar um menu para instalar plugins externos no ND8 usando a nova arquitetura `ND8_HOME`, permitindo instalar a partir de link de repositorio ou arquivo `.zip`, mostrando preview seguro do `manifest.json` antes da instalacao.

O usuario deve conseguir escolher se o plugin sera habilitado apenas no profile atual ou em todos os profiles.

## Opiniao Sobre A Ideia Do `release/`

A ideia e correta.

Ela resolve tres problemas importantes:

- o ND8 nao precisa adivinhar como buildar plugin de cada repositorio;
- o backend nao precisa executar codigo desconhecido para ler informacoes basicas;
- dependencias ficam previsiveis via `package-lock.json`.

Mas tem uma regra importante:

> O installer nao deve rodar `npm install` no `server/node_modules` do ND8.

Cada plugin externo precisa ter dependencias isoladas dentro da propria pasta instalada.

## Lei Do Plugin Externo

Todo plugin externo instalavel precisa publicar uma pasta `release/` na raiz do repositorio ou dentro do `.zip`.

Estrutura obrigatoria:

```text
release/
  manifest.json
  index.js
  methods.js
  package.json
  package-lock.json
```

Regras:

- Sem `release/`, o ND8 recusa instalar.
- `manifest.json` e lido primeiro, sem executar `index.js`.
- `manifest.json` precisa passar no contrato de plugin atual.
- `package-lock.json` e obrigatorio para instalacao reproduzivel.
- `index.js` e `methods.js` precisam ficar dentro da pasta do plugin.
- O plugin instalado nao pode escrever fora da propria pasta.
- O plugin instalado nao pode sobrescrever plugin interno.
- O plugin instalado nao pode instalar dependencia global.
- O plugin instalado nao pode compartilhar `node_modules` com outro plugin.

## Decisao De Escopo

Este plano implementa o installer que consome `release/`.

Nao implementa ainda a CLI completa `nd8 build`.

O contrato fica preparado para a futura CLI:

- `nd8 build` vai gerar `release/`.
- `nd8 build` vai copiar `manifest.json`.
- `nd8 build` vai compilar `index.ts` para `index.js`.
- `nd8 build` vai compilar `methods.ts` para `methods.js`.
- `nd8 build` vai gerar/copiar `package.json` e `package-lock.json`.

Esse escopo evita misturar duas features grandes: Developer CLI e User Installer.

## Novo Fluxo De Instalacao

### Link De Repositorio

1. Usuario cola URL do repositorio.
2. Backend baixa para `ND8_HOME/global/plugin-cache`.
3. Backend procura `release/`.
4. Backend le `release/manifest.json`.
5. Backend valida manifest sem executar codigo.
6. Frontend mostra preview no painel direito.
7. Usuario escolhe escopo:
   - profile atual;
   - todos os profiles.
8. Usuario confirma.
9. Backend instala em `ND8_HOME/global/plugins/<plugin-id>/<version>/`.
10. Backend instala dependencias isoladas dentro da pasta do plugin.
11. Backend registra no `plugins.db`.
12. Backend habilita no profile escolhido.
13. Backend recarrega plugin ou pede restart controlado se hot reload nao for seguro.

### Arquivo Zip

1. Usuario seleciona ou arrasta `.zip`.
2. Backend salva zip temporario em `ND8_HOME/global/plugin-cache`.
3. Backend extrai em pasta temporaria segura.
4. Backend bloqueia path traversal.
5. Backend procura `release/`.
6. Backend segue o mesmo fluxo de preview e instalacao.

## Estrutura Alvo No ND8_HOME

```text
ND8_HOME/
  global/
    plugins/
      plugin-id/
        1.0.0/
          manifest.json
          index.js
          methods.js
          package.json
          package-lock.json
          node_modules/

    plugin-cache/
      downloads/
      extracted/
      previews/

  profiles/
    default/
      plugin-settings.json
```

## Estrategia De Dependencias

Cada plugin tem seu proprio `node_modules`.

Exemplo:

```text
ND8_HOME/global/plugins/github-tools/1.0.0/node_modules/
ND8_HOME/global/plugins/slack-tools/1.0.0/node_modules/
```

Isso evita:

- conflito entre versoes de libs;
- plugin A substituir dependencia do plugin B;
- plugin externo poluir dependencias internas do ND8;
- update do ND8 quebrar plugin externo.

Instalacao:

- usar `npm ci --omit=dev` dentro da pasta instalada do plugin;
- usar exatamente o `package-lock.json` do `release/`;
- nao aceitar install sem lockfile;
- limitar tempo de instalacao;
- limitar tamanho do pacote;
- capturar logs de instalacao em `ND8_HOME/global/logs/plugin-installs`.

Risco:

- `npm ci` executa lifecycle scripts por padrao.

Decisao recomendada para primeira versao:

- rodar `npm ci --omit=dev --ignore-scripts`;
- se um plugin precisar script nativo, fica fora do alpha;
- depois criar permissao explicita para permitir scripts, com aviso forte.

## Arquitetura Backend

### 1. PluginInstallSourceResolver

Responsavel por transformar entrada do usuario em uma pasta local temporaria.

Entradas:

- URL de repositorio;
- arquivo `.zip`.

Saida:

- path local extraido;
- tipo da fonte;
- metadados de origem.

Nao valida manifest.

### 2. PluginReleaseLocator

Responsavel por encontrar a pasta `release/`.

Regras:

- procurar somente dentro da pasta extraida;
- rejeitar se houver mais de um `release/` ambiguo;
- rejeitar se nao existir `release/`;
- rejeitar se faltar arquivo obrigatorio.

### 3. PluginManifestPreviewService

Responsavel por ler `release/manifest.json` sem executar codigo.

Ja existe base em:

- `server/src/core/modules/plugins/plugin-manifest-preview.ts`

Precisa evoluir para retornar:

- metadata;
- methods;
- triggers;
- auth type;
- icon;
- author;
- version;
- repository;
- warnings;
- errors.

### 4. PluginInstallValidator

Responsavel por validar se o plugin pode ser instalado.

Validacoes:

- `metadata.id` kebab-case;
- `metadata.version` semver;
- plugin interno com mesmo id bloqueia externo;
- plugin externo existente com mesma versao exige decisao de reinstall;
- downgrade exige confirmacao explicita;
- `package-lock.json` obrigatorio;
- paths dentro do release nao podem escapar da pasta;
- tamanho maximo do release;
- tamanho maximo extraido;
- quantidade maxima de arquivos.

### 5. PluginInstaller

Responsavel por copiar o `release/` para o destino final.

Destino:

```text
ND8_HOME/global/plugins/<plugin-id>/<version>/
```

Fluxo:

- criar pasta staging;
- copiar arquivos do `release/`;
- rodar instalacao de dependencias no staging;
- validar entrypoint depois da instalacao;
- mover staging para destino final de forma atomica;
- registrar no `plugins.db`;
- atualizar profile settings;
- limpar cache temporario.

### 6. PluginDependencyInstaller

Responsavel apenas por dependencias.

Regras:

- roda dentro da pasta do plugin;
- usa `npm ci --omit=dev --ignore-scripts`;
- usa lockfile do plugin;
- timeout configuravel;
- log por instalacao;
- nao altera package do ND8.

### 7. PluginProfileScopeService

Responsavel por habilitar plugin por profile.

Escopos:

- `current_profile`;
- `all_profiles`.

Primeira versao:

- usar profile `default` como current profile;
- manter contrato pronto para multiplos profiles;
- nao implementar UI completa de profiles agora.

### 8. PluginRuntimeReloadService

Responsavel por tornar o plugin disponivel depois da instalacao.

Opcao recomendada alpha:

- carregar plugin recem-instalado via loader externo;
- se falhar, manter instalado mas marcar erro no registry;
- nao derrubar servidor.

Fallback:

- se hot reload ficar instavel, mostrar "restart required".

## Rotas Backend Propostas

### Criar preview por URL

`POST /plugins/external/preview-url`

Entrada:

- `repositoryUrl`

Saida:

- `previewId`
- manifest metadata;
- methods;
- warnings;
- errors.

### Criar preview por ZIP

`POST /plugins/external/preview-zip`

Entrada:

- multipart file `.zip`

Saida:

- `previewId`
- manifest metadata;
- methods;
- warnings;
- errors.

### Confirmar instalacao

`POST /plugins/external/install`

Entrada:

- `previewId`
- `scope`
- `reinstallPolicy`

Saida:

- plugin id;
- version;
- install path;
- profile scope aplicado;
- reload status.

### Cancelar preview

`DELETE /plugins/external/previews/:previewId`

Comportamento:

- remove cache temporario;
- nao altera registry;
- nao instala nada.

## UX Frontend

Tela:

- `client-vue/src/app/pages/PluginsPage.vue`

Layout proposto:

- esquerda: menu/lista de plugins instalados;
- centro: area de install externo;
- direita: painel de preview.

Controles:

- input para URL de repositorio;
- area drag/drop de `.zip`;
- botao "Preview";
- seletor de escopo:
  - Profile atual;
  - Todos os profiles;
- botao "Install";
- estado de instalando;
- estado de erro;
- estado de sucesso.

Preview deve mostrar:

- nome;
- descricao;
- icone;
- author;
- version;
- repository;
- auth type;
- methods;
- triggers;
- warnings de seguranca.

Nao mostrar:

- texto explicando como usar a pagina;
- tutorial longo dentro da tela;
- detalhes internos do filesystem.

## Arquivos Provaveis

### Backend

- Criar `server/src/core/modules/plugins/external/plugin-install-source-resolver.ts`
- Criar `server/src/core/modules/plugins/external/plugin-release-locator.ts`
- Criar `server/src/core/modules/plugins/external/plugin-install-validator.ts`
- Criar `server/src/core/modules/plugins/external/plugin-installer.ts`
- Criar `server/src/core/modules/plugins/external/plugin-dependency-installer.ts`
- Criar `server/src/core/modules/plugins/external/plugin-profile-scope-service.ts`
- Criar `server/src/core/modules/plugins/external/plugin-preview-store.ts`
- Criar `server/src/core/modules/plugins/external/plugin-runtime-reload-service.ts`
- Modificar `server/src/core/modules/plugins/plugin-manifest-preview.ts`
- Modificar `server/src/core/modules/plugins/loader.ts`
- Modificar `server/src/core/routes/plugins.routes.ts`
- Modificar `server/src/core/database/migrations/plugins/*`
- Modificar `server/src/core/runtime/profile-plugin-settings.ts`

### Frontend

- Modificar `client-vue/src/app/pages/PluginsPage.vue`
- Criar `client-vue/src/features/plugins/components/ExternalPluginInstaller.vue`
- Criar `client-vue/src/features/plugins/components/ExternalPluginPreviewPanel.vue`
- Criar `client-vue/src/features/plugins/components/InstalledPluginsList.vue`
- Modificar `client-vue/src/core/api/plugins.api.ts`
- Modificar `client-vue/src/core/api/endpoints.ts`
- Modificar `client-vue/src/core/types/plugin.types.ts`

## Plano De Tasks

### Task 1 - Consolidar contrato `release/`

- [ ] Documentar a lei do `release/` neste plano.
- [ ] Definir arquivos obrigatorios.
- [ ] Definir que `package-lock.json` e obrigatorio.
- [ ] Definir que dependencia e isolada por plugin.
- [ ] Definir que installer nao executa codigo durante preview.
- [ ] Commit.

### Task 2 - Criar tipos backend para installer externo

- [ ] Criar tipos de source: `repository_url` e `zip_upload`.
- [ ] Criar tipos de preview status.
- [ ] Criar tipos de install scope: `current_profile` e `all_profiles`.
- [ ] Criar tipos de reinstall policy.
- [ ] Criar tipos de install result.
- [ ] Testar validacao de tipos/contratos.
- [ ] Commit.

### Task 3 - Criar PluginReleaseLocator

- [ ] Escrever teste para erro quando nao existe `release/`.
- [ ] Escrever teste para erro quando falta `manifest.json`.
- [ ] Escrever teste para erro quando falta `package-lock.json`.
- [ ] Escrever teste para release valido.
- [ ] Implementar locator sem executar codigo.
- [ ] Commit.

### Task 4 - Criar validacao segura de ZIP

- [ ] Escrever teste para bloquear path traversal.
- [ ] Escrever teste para bloquear arquivo absoluto.
- [ ] Escrever teste para limitar tamanho extraido.
- [ ] Escrever teste para aceitar zip valido com `release/`.
- [ ] Implementar extracao segura em cache.
- [ ] Commit.

### Task 5 - Criar resolver de URL de repositorio

- [ ] Escrever teste para aceitar URL GitHub HTTPS.
- [ ] Escrever teste para rejeitar protocolo nao permitido.
- [ ] Escrever teste para rejeitar URL local/file.
- [ ] Baixar repositorio para `ND8_HOME/global/plugin-cache/downloads`.
- [ ] Extrair ou clonar para pasta temporaria unica.
- [ ] Commit.

### Task 6 - Evoluir manifest preview

- [ ] Escrever teste para preview com metadata completa.
- [ ] Escrever teste para listar methods.
- [ ] Escrever teste para listar triggers quando existirem.
- [ ] Escrever teste provando que `index.js` nao roda.
- [ ] Retornar warnings e errors estruturados.
- [ ] Commit.

### Task 7 - Criar preview store temporario

- [ ] Criar `previewId`.
- [ ] Guardar source path temporario.
- [ ] Guardar manifest preview.
- [ ] Expirar preview antigo.
- [ ] Remover preview cancelado.
- [ ] Testar expiracao e cleanup.
- [ ] Commit.

### Task 8 - Criar rotas de preview

- [ ] Criar `POST /plugins/external/preview-url`.
- [ ] Criar `POST /plugins/external/preview-zip`.
- [ ] Validar payloads com zod.
- [ ] Retornar erro claro quando nao houver `release/`.
- [ ] Retornar erro claro quando manifest for invalido.
- [ ] Testar rotas com Fastify inject.
- [ ] Commit.

### Task 9 - Criar PluginInstallValidator

- [ ] Bloquear conflito com plugin interno.
- [ ] Detectar plugin externo ja instalado na mesma versao.
- [ ] Detectar downgrade.
- [ ] Validar lockfile obrigatorio.
- [ ] Validar entrypoint obrigatorio.
- [ ] Validar paths dentro do release.
- [ ] Testar todos os casos.
- [ ] Commit.

### Task 10 - Criar PluginDependencyInstaller

- [ ] Escrever teste para comando rodar dentro da pasta do plugin.
- [ ] Usar `npm ci --omit=dev --ignore-scripts`.
- [ ] Usar timeout.
- [ ] Capturar logs.
- [ ] Falha de dependencia deve deixar staging limpo.
- [ ] Commit.

### Task 11 - Criar PluginInstaller com staging atomico

- [ ] Criar pasta staging em `ND8_HOME/global/plugin-cache`.
- [ ] Copiar `release/` para staging.
- [ ] Instalar dependencias no staging.
- [ ] Mover staging para `ND8_HOME/global/plugins/<id>/<version>`.
- [ ] Nao sobrescrever instalacao existente sem policy.
- [ ] Registrar no `plugins.db`.
- [ ] Limpar cache temporario.
- [ ] Testar sucesso e falha.
- [ ] Commit.

### Task 12 - Atualizar registry para multiplas versoes externas

- [ ] Decidir se registry guarda plugin por `id` ou `id + version`.
- [ ] Recomendacao: guardar instalacao por `id + version`, e enabled aponta versao ativa.
- [ ] Criar migracao se necessario.
- [ ] Preservar compatibilidade com plugins internos.
- [ ] Testar upgrade e reinstall.
- [ ] Commit.

### Task 13 - Aplicar escopo por profile

- [ ] Implementar `current_profile` usando `profiles/default`.
- [ ] Implementar `all_profiles` iterando profiles existentes.
- [ ] Atualizar `plugin-settings.json`.
- [ ] Nao mover credentials ainda.
- [ ] Testar profile atual.
- [ ] Testar todos os profiles.
- [ ] Commit.

### Task 14 - Runtime reload externo

- [ ] Carregar plugin instalado sem reiniciar servidor.
- [ ] Se carregar falhar, marcar erro no resultado.
- [ ] Nao derrubar servidor.
- [ ] Nao executar plugin durante preview.
- [ ] Testar hot reload com plugin fake.
- [ ] Testar falha de import.
- [ ] Commit.

### Task 15 - Criar rota de install confirmada

- [ ] Criar `POST /plugins/external/install`.
- [ ] Validar `previewId`.
- [ ] Validar `scope`.
- [ ] Validar `reinstallPolicy`.
- [ ] Chamar installer.
- [ ] Retornar install result.
- [ ] Testar sucesso, conflito e preview expirado.
- [ ] Commit.

### Task 16 - Criar API frontend

- [ ] Adicionar endpoints.
- [ ] Adicionar `pluginsApi.previewExternalUrl`.
- [ ] Adicionar `pluginsApi.previewExternalZip`.
- [ ] Adicionar `pluginsApi.installExternal`.
- [ ] Adicionar tipos de preview e install result.
- [ ] Testar chamadas com mocks ou type-check.
- [ ] Commit.

### Task 17 - Construir UI base da PluginsPage

- [ ] Substituir placeholder.
- [ ] Criar layout com lista instalada, installer e preview.
- [ ] Manter visual consistente com app shell.
- [ ] Nao criar landing page.
- [ ] Garantir responsividade basica.
- [ ] Commit.

### Task 18 - Criar ExternalPluginInstaller

- [ ] Input de URL.
- [ ] Dropzone de zip.
- [ ] Botao preview.
- [ ] Estado loading.
- [ ] Estado erro.
- [ ] Estado sucesso.
- [ ] Bloquear install sem preview valido.
- [ ] Commit.

### Task 19 - Criar ExternalPluginPreviewPanel

- [ ] Mostrar nome.
- [ ] Mostrar descricao.
- [ ] Mostrar icone.
- [ ] Mostrar author.
- [ ] Mostrar version.
- [ ] Mostrar repository.
- [ ] Mostrar methods.
- [ ] Mostrar triggers.
- [ ] Mostrar warnings.
- [ ] Mostrar escopo de instalacao.
- [ ] Commit.

### Task 20 - Criar fluxo de install no frontend

- [ ] Selecionar `profile atual`.
- [ ] Selecionar `todos os profiles`.
- [ ] Confirmar install.
- [ ] Mostrar progresso.
- [ ] Mostrar resultado.
- [ ] Atualizar lista de plugins instalados.
- [ ] Commit.

### Task 21 - Hardening de seguranca

- [ ] Limitar tamanho de zip.
- [ ] Limitar tamanho extraido.
- [ ] Limitar tempo de download.
- [ ] Limitar tempo de install.
- [ ] Bloquear protocolos perigosos.
- [ ] Sanitizar logs.
- [ ] Garantir cleanup em erro.
- [ ] Commit.

### Task 22 - Regressao local

- [ ] Criar plugin fake com `release/` valido.
- [ ] Testar preview por pasta/zip.
- [ ] Testar preview por URL usando fixture local ou mock.
- [ ] Testar install com dependencias isoladas.
- [ ] Confirmar plugin aparece em `/plugins`.
- [ ] Confirmar plugin externo nao sobrescreve interno.
- [ ] Rodar testes backend.
- [ ] Rodar build frontend.
- [ ] Commit final se houver ajuste.

## Criterios De Aceite

- Menu de plugins externos existe na PluginsPage.
- Usuario consegue gerar preview por URL.
- Usuario consegue gerar preview por zip.
- Sem `release/`, instalacao e bloqueada.
- Preview mostra metadata, author, version, icon, methods e triggers.
- Preview nao executa codigo do plugin.
- Install usa `ND8_HOME/global/plugins`.
- Dependencias ficam isoladas por plugin.
- `package-lock.json` e obrigatorio.
- Plugin externo nao sobrescreve plugin interno.
- Usuario escolhe profile atual ou todos os profiles.
- Plugin instalado aparece em `/plugins`.
- Falha de instalacao nao deixa pasta quebrada como plugin ativo.
- Testes backend passam.
- Build frontend passa.

## Riscos

- Executar codigo malicioso durante preview. Mitigacao: ler somente `manifest.json`.
- Dependencias conflitarem entre plugins. Mitigacao: `node_modules` por plugin.
- `npm install` rodar scripts perigosos. Mitigacao: `npm ci --omit=dev --ignore-scripts`.
- Zip path traversal. Mitigacao: extracao segura e path normalization.
- Repositorio enorme ou zip gigante. Mitigacao: limites de tamanho e timeout.
- Hot reload instavel. Mitigacao: fallback para restart required.
- Misturar profiles cedo demais. Mitigacao: usar `default` como profile atual e manter contrato pronto.

## Ordem Recomendada

1. Contrato `release/`.
2. Release locator.
3. Preview seguro.
4. Preview routes.
5. Install validator.
6. Dependency installer isolado.
7. Installer com staging atomico.
8. Profile scope.
9. Runtime reload.
10. UI de preview/install.
11. Hardening.
12. Regressao completa.

## Nota Sobre A CLI

A CLI `nd8 build` deve ser a proxima feature de developer experience depois do installer alpha.

Ela deve gerar exatamente o `release/` que este installer espera.

Nao misturar a CLI neste plano reduz risco e acelera a entrega do installer.
