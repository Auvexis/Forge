# External Plugin Installer Plan

## Objetivo

Criar um menu para instalar plugins externos no ND8 usando a arquitetura `ND8_HOME`, permitindo instalar a partir de link de repositorio ou de uma pasta ja extraida, mostrando preview seguro do `manifest.json` antes da instalacao.

O usuario deve escolher se o plugin sera habilitado apenas no profile atual ou em todos os profiles.

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

Todo plugin externo instalavel precisa publicar uma pasta `release/` na raiz do repositorio ou dentro da pasta extraida selecionada pelo usuario.

Estrutura obrigatoria:

- `release/manifest.json`
- `release/index.js`
- `release/methods.js`
- `release/package.json`
- `release/package-lock.json`

Regras:

- Sem `release/`, o ND8 recusa instalar.
- `manifest.json` e lido primeiro, sem executar `index.js`.
- `manifest.json` precisa passar no contrato de plugin atual.
- `package-lock.json` e obrigatorio para instalacao reproduzivel.
- `index.js` e `methods.js` precisam ficar dentro da pasta do plugin.
- O plugin instalado nao pode escrever fora da propria pasta.
- O plugin instalado nao pode instalar dependencia global.
- O plugin instalado nao pode compartilhar `node_modules` com outro plugin.
- O plugin instalado nao pode escolher o proprio id de instalacao.

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

## Decisao Sobre Id Unico De Instalacao

Plugins externos instalados devem usar uma pasta unica por instalacao.

Formato:

- `ND8_HOME/global/plugins/<plugin-id>-<hex32>/`

Exemplo:

- `ND8_HOME/global/plugins/github-tools-88f0c9401001ed2a6dce94eb8efac5d8/`

Regras:

- `pluginId` continua sendo o id declarado no `manifest.json`.
- `installId` e gerado pelo ND8 no formato `<pluginId>-<hex32>`.
- `hex32` deve ser aleatorio, lowercase e com 32 caracteres hexadecimais.
- `installId` e a identidade da instalacao externa.
- Duas instalacoes com o mesmo `pluginId`, nome ou versao nao se sobrescrevem.
- Registry, profile settings e workflows devem referenciar a instalacao externa por `installId`.
- UI pode mostrar o nome/id original do manifest, mas operacoes internas usam `installId`.
- Plugins internos continuam usando seus ids atuais.
- Plugin externo nao pode substituir plugin interno porque o caminho e a identidade runtime sao install-scoped.

Essa decisao evita conflito quando o usuario instala dois plugins diferentes com o mesmo nome/id, ou duas builds do mesmo plugin.

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
9. Backend gera `installId` com `<pluginId>-<hex32>`.
10. Backend instala em `ND8_HOME/global/plugins/<installId>/`.
11. Backend instala dependencias isoladas dentro da pasta do plugin.
12. Backend registra no `plugins.db`.
13. Backend habilita o `installId` no profile escolhido.
14. Backend recarrega plugin ou pede restart controlado se hot reload nao for seguro.

### Pasta Extraida

1. Usuario seleciona uma pasta ja extraida.
2. Frontend envia a pasta selecionada para preview.
3. Backend guarda a entrada em cache temporario dentro de `ND8_HOME/global/plugin-cache`.
4. Backend valida que todos os arquivos continuam dentro da pasta base.
5. Backend bloqueia symlink ou path que escape da pasta base.
6. Backend procura `release/`.
7. Backend segue o mesmo fluxo de preview e instalacao.

Observacao importante:

- Em browser comum, o frontend nao deve confiar em path absoluto do PC do usuario.
- O backend so deve aceitar path local direto em modo local/desktop confiavel.
- No modo web, usar envio de pasta pelo seletor de diretorio quando suportado.

## Estrutura Alvo No ND8_HOME

Estrutura principal:

- `ND8_HOME/global/plugins/<installId>/manifest.json`
- `ND8_HOME/global/plugins/<installId>/index.js`
- `ND8_HOME/global/plugins/<installId>/methods.js`
- `ND8_HOME/global/plugins/<installId>/package.json`
- `ND8_HOME/global/plugins/<installId>/package-lock.json`
- `ND8_HOME/global/plugins/<installId>/node_modules/`
- `ND8_HOME/global/plugin-cache/downloads/`
- `ND8_HOME/global/plugin-cache/folders/`
- `ND8_HOME/global/plugin-cache/previews/`
- `ND8_HOME/profiles/default/plugin-settings.json`

Exemplo:

- `ND8_HOME/global/plugins/github-tools-88f0c9401001ed2a6dce94eb8efac5d8/node_modules/`
- `ND8_HOME/global/plugins/github-tools-6d31f61adfe74f54985d157ad6aa8120/node_modules/`

Essas duas instalacoes podem ter o mesmo `pluginId` no manifest, mas sao instancias diferentes.

## Estrategia De Dependencias

Cada instalacao externa tem seu proprio `node_modules`.

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
- pasta extraida.

Saida:

- path local temporario;
- tipo da fonte;
- metadados de origem.

Nao valida manifest.

### 2. PluginReleaseLocator

Responsavel por encontrar a pasta `release/`.

Regras:

- procurar somente dentro da pasta recebida;
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
- `package-lock.json` obrigatorio;
- paths dentro do release nao podem escapar da pasta;
- symlinks nao podem apontar para fora da pasta;
- tamanho maximo do release;
- tamanho maximo da pasta recebida;
- quantidade maxima de arquivos;
- permissao runtime nao pode depender do `pluginId` original ser unico.

### 5. PluginInstallIdGenerator

Responsavel por gerar id unico de instalacao.

Regras:

- receber `pluginId` validado do manifest;
- gerar `hex32` criptograficamente forte;
- montar `installId` com `<pluginId>-<hex32>`;
- verificar que a pasta destino ainda nao existe;
- nunca aceitar `installId` vindo do plugin ou do frontend.

### 6. PluginInstaller

Responsavel por copiar o `release/` para o destino final.

Destino:

- `ND8_HOME/global/plugins/<installId>/`

Fluxo:

- criar pasta staging;
- copiar arquivos do `release/`;
- rodar instalacao de dependencias no staging;
- validar entrypoint depois da instalacao;
- mover staging para destino final de forma atomica;
- registrar no `plugins.db`;
- atualizar profile settings com `installId`;
- limpar cache temporario.

### 7. PluginDependencyInstaller

Responsavel apenas por dependencias.

Regras:

- roda dentro da pasta da instalacao;
- usa `npm ci --omit=dev --ignore-scripts`;
- usa lockfile do plugin;
- timeout configuravel;
- log por instalacao;
- nao altera package do ND8.

### 8. PluginProfileScopeService

Responsavel por habilitar plugin por profile.

Escopos:

- `current_profile`;
- `all_profiles`.

Primeira versao:

- usar profile `default` como current profile;
- manter contrato pronto para multiplos profiles;
- nao implementar UI completa de profiles agora.

### 9. PluginRuntimeReloadService

Responsavel por tornar o plugin disponivel depois da instalacao.

Decisao importante:

- plugin externo deve ser registrado no runtime pelo `installId`;
- `manifest.metadata.id` permanece como id original para exibicao;
- APIs e workflows devem usar `installId` para plugins externos.

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

### Criar preview por pasta extraida

`POST /plugins/external/preview-folder`

Entrada:

- pasta selecionada pelo usuario;
- ou payload de diretorio enviado pelo frontend;
- ou path local apenas em modo local/desktop confiavel.

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

Saida:

- `installId`;
- `pluginId`;
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
- seletor de pasta extraida;
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

Lista de plugins instalados deve mostrar:

- nome do plugin;
- version;
- author;
- `installId` em area tecnica/expandida;
- profile onde esta habilitado;
- status runtime.

## Arquivos Provaveis

### Backend

- Criar `server/src/core/modules/plugins/external/plugin-install-source-resolver.ts`
- Criar `server/src/core/modules/plugins/external/plugin-release-locator.ts`
- Criar `server/src/core/modules/plugins/external/plugin-install-validator.ts`
- Criar `server/src/core/modules/plugins/external/plugin-install-id-generator.ts`
- Criar `server/src/core/modules/plugins/external/plugin-installer.ts`
- Criar `server/src/core/modules/plugins/external/plugin-dependency-installer.ts`
- Criar `server/src/core/modules/plugins/external/plugin-profile-scope-service.ts`
- Criar `server/src/core/modules/plugins/external/plugin-preview-store.ts`
- Criar `server/src/core/modules/plugins/external/plugin-runtime-reload-service.ts`
- Modificar `server/src/core/modules/plugins/plugin-manifest-preview.ts`
- Modificar `server/src/core/modules/plugins/loader.ts`
- Modificar `server/src/core/modules/plugins/plugin-manager.ts`
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
- [ ] Definir que dependencia e isolada por instalacao.
- [ ] Definir que installer nao executa codigo durante preview.
- [ ] Commit.

### Task 2 - Criar tipos backend para installer externo

- [ ] Criar tipos de source: `repository_url` e `extracted_folder`.
- [ ] Criar tipos de preview status.
- [ ] Criar tipos de install scope: `current_profile` e `all_profiles`.
- [ ] Criar tipos de install source metadata.
- [ ] Criar tipos de install result com `installId` e `pluginId`.
- [ ] Testar validacao de tipos/contratos.
- [ ] Commit.

### Task 3 - Criar PluginReleaseLocator

- [ ] Escrever teste para erro quando nao existe `release/`.
- [ ] Escrever teste para erro quando falta `manifest.json`.
- [ ] Escrever teste para erro quando falta `package-lock.json`.
- [ ] Escrever teste para release valido.
- [ ] Implementar locator sem executar codigo.
- [ ] Commit.

### Task 4 - Criar validacao segura de pasta extraida

- [ ] Escrever teste para bloquear path traversal.
- [ ] Escrever teste para bloquear path absoluto.
- [ ] Escrever teste para bloquear symlink que escape da pasta base.
- [ ] Escrever teste para limitar tamanho total.
- [ ] Escrever teste para limitar quantidade de arquivos.
- [ ] Escrever teste para aceitar pasta valida com `release/`.
- [ ] Implementar copia segura para cache.
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
- [ ] Criar `POST /plugins/external/preview-folder`.
- [ ] Validar payloads com zod.
- [ ] Retornar erro claro quando nao houver `release/`.
- [ ] Retornar erro claro quando manifest for invalido.
- [ ] Testar rotas com Fastify inject.
- [ ] Commit.

### Task 9 - Criar PluginInstallIdGenerator

- [ ] Escrever teste para gerar `installId` no formato `<pluginId>-<hex32>`.
- [ ] Escrever teste para `hex32` lowercase.
- [ ] Escrever teste para nao aceitar `installId` vindo do frontend.
- [ ] Escrever teste para evitar colisao se pasta ja existir.
- [ ] Implementar geracao criptograficamente forte.
- [ ] Commit.

### Task 10 - Criar PluginInstallValidator

- [ ] Validar lockfile obrigatorio.
- [ ] Validar entrypoint obrigatorio.
- [ ] Validar paths dentro do release.
- [ ] Validar que plugin externo usa identidade runtime por `installId`.
- [ ] Validar que plugin interno nao e sobrescrito.
- [ ] Testar multiplas instalacoes com mesmo `pluginId`.
- [ ] Commit.

### Task 11 - Criar PluginDependencyInstaller

- [ ] Escrever teste para comando rodar dentro da pasta do plugin.
- [ ] Usar `npm ci --omit=dev --ignore-scripts`.
- [ ] Usar timeout.
- [ ] Capturar logs.
- [ ] Falha de dependencia deve deixar staging limpo.
- [ ] Commit.

### Task 12 - Criar PluginInstaller com staging atomico

- [ ] Criar pasta staging em `ND8_HOME/global/plugin-cache`.
- [ ] Copiar `release/` para staging.
- [ ] Gerar `installId`.
- [ ] Instalar dependencias no staging.
- [ ] Mover staging para `ND8_HOME/global/plugins/<installId>`.
- [ ] Nunca sobrescrever instalacao existente.
- [ ] Registrar no `plugins.db`.
- [ ] Limpar cache temporario.
- [ ] Testar sucesso e falha.
- [ ] Commit.

### Task 13 - Atualizar registry para instalacoes externas

- [ ] Registry deve guardar `installId`.
- [ ] Registry deve guardar `pluginId` original do manifest.
- [ ] Registry deve guardar version, source, install path e status.
- [ ] Profile settings deve habilitar externo por `installId`.
- [ ] Preservar compatibilidade com plugins internos.
- [ ] Testar duas instalacoes com mesmo `pluginId`.
- [ ] Commit.

### Task 14 - Aplicar escopo por profile

- [ ] Implementar `current_profile` usando `profiles/default`.
- [ ] Implementar `all_profiles` iterando profiles existentes.
- [ ] Atualizar `plugin-settings.json` com `installId`.
- [ ] Nao mover credentials ainda.
- [ ] Testar profile atual.
- [ ] Testar todos os profiles.
- [ ] Commit.

### Task 15 - Runtime reload externo

- [ ] Carregar plugin instalado sem reiniciar servidor.
- [ ] Registrar externo no runtime por `installId`.
- [ ] Preservar `pluginId` original como metadata.
- [ ] Se carregar falhar, marcar erro no resultado.
- [ ] Nao derrubar servidor.
- [ ] Nao executar plugin durante preview.
- [ ] Testar hot reload com plugin fake.
- [ ] Testar falha de import.
- [ ] Commit.

### Task 16 - Criar rota de install confirmada

- [ ] Criar `POST /plugins/external/install`.
- [ ] Validar `previewId`.
- [ ] Validar `scope`.
- [ ] Chamar installer.
- [ ] Retornar install result com `installId`.
- [ ] Testar sucesso, conflito e preview expirado.
- [ ] Commit.

### Task 17 - Criar API frontend

- [ ] Adicionar endpoints.
- [ ] Adicionar `pluginsApi.previewExternalUrl`.
- [ ] Adicionar `pluginsApi.previewExternalFolder`.
- [ ] Adicionar `pluginsApi.installExternal`.
- [ ] Adicionar tipos de preview e install result.
- [ ] Testar chamadas com mocks ou type-check.
- [ ] Commit.

### Task 18 - Construir UI base da PluginsPage

- [ ] Substituir placeholder.
- [ ] Criar layout com lista instalada, installer e preview.
- [ ] Manter visual consistente com app shell.
- [ ] Nao criar landing page.
- [ ] Garantir responsividade basica.
- [ ] Commit.

### Task 19 - Criar ExternalPluginInstaller

- [ ] Input de URL.
- [ ] Seletor de pasta extraida.
- [ ] Botao preview.
- [ ] Estado loading.
- [ ] Estado erro.
- [ ] Estado sucesso.
- [ ] Bloquear install sem preview valido.
- [ ] Commit.

### Task 20 - Criar ExternalPluginPreviewPanel

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

### Task 21 - Criar fluxo de install no frontend

- [ ] Selecionar `profile atual`.
- [ ] Selecionar `todos os profiles`.
- [ ] Confirmar install.
- [ ] Mostrar progresso.
- [ ] Mostrar resultado com `installId`.
- [ ] Atualizar lista de plugins instalados.
- [ ] Commit.

### Task 22 - Hardening de seguranca

- [ ] Limitar tamanho da pasta recebida.
- [ ] Limitar quantidade de arquivos.
- [ ] Limitar tempo de download.
- [ ] Limitar tempo de install.
- [ ] Bloquear protocolos perigosos.
- [ ] Bloquear symlink para fora da pasta.
- [ ] Sanitizar logs.
- [ ] Garantir cleanup em erro.
- [ ] Commit.

### Task 23 - Regressao local

- [ ] Criar plugin fake com `release/` valido.
- [ ] Testar preview por pasta extraida.
- [ ] Testar preview por URL usando fixture local ou mock.
- [ ] Testar install com dependencias isoladas.
- [ ] Confirmar plugin aparece em `/plugins`.
- [ ] Confirmar duas instalacoes com mesmo `pluginId` nao se sobrescrevem.
- [ ] Confirmar plugin externo nao sobrescreve interno.
- [ ] Rodar testes backend.
- [ ] Rodar build frontend.
- [ ] Commit final se houver ajuste.

## Criterios De Aceite

- Menu de plugins externos existe na PluginsPage.
- Usuario consegue gerar preview por URL.
- Usuario consegue gerar preview por pasta extraida.
- Sem `release/`, instalacao e bloqueada.
- Preview mostra metadata, author, version, icon, methods e triggers.
- Preview nao executa codigo do plugin.
- Install usa `ND8_HOME/global/plugins/<installId>`.
- `installId` segue `<pluginId>-<hex32>`.
- Duas instalacoes com mesmo `pluginId` nao se sobrescrevem.
- Dependencias ficam isoladas por instalacao.
- `package-lock.json` e obrigatorio.
- Plugin externo nao sobrescreve plugin interno.
- Usuario escolhe profile atual ou todos os profiles.
- Plugin instalado aparece em `/plugins`.
- Falha de instalacao nao deixa pasta quebrada como plugin ativo.
- Testes backend passam.
- Build frontend passa.

## Riscos

- Executar codigo malicioso durante preview. Mitigacao: ler somente `manifest.json`.
- Dependencias conflitarem entre plugins. Mitigacao: `node_modules` por instalacao.
- `npm install` rodar scripts perigosos. Mitigacao: `npm ci --omit=dev --ignore-scripts`.
- Pasta extraida conter symlink/path perigoso. Mitigacao: validar path real dentro da base.
- Repositorio enorme ou pasta gigante. Mitigacao: limites de tamanho, arquivos e timeout.
- Hot reload instavel. Mitigacao: fallback para restart required.
- APIs antigas esperarem `pluginId` unico. Mitigacao: externos usam `installId` como identidade runtime.
- Misturar profiles cedo demais. Mitigacao: usar `default` como profile atual e manter contrato pronto.

## Ordem Recomendada

1. Contrato `release/`.
2. Release locator.
3. Validacao de pasta extraida.
4. Preview seguro.
5. Preview routes.
6. Install id generator.
7. Install validator.
8. Dependency installer isolado.
9. Installer com staging atomico.
10. Registry por instalacao.
11. Profile scope.
12. Runtime reload.
13. UI de preview/install.
14. Hardening.
15. Regressao completa.

## Nota Sobre A CLI

A CLI `nd8 build` deve ser a proxima feature de developer experience depois do installer alpha.

Ela deve gerar exatamente o `release/` que este installer espera.

Nao misturar a CLI neste plano reduz risco e acelera a entrega do installer.
