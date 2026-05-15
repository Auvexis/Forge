# ND8 Home Runtime Architecture Plan

## Objetivo

Criar uma arquitetura de runtime persistente baseada em `ND8_HOME`, para o ND8 funcionar bem como pacote npm e como container Docker, sem depender de caminhos fixos do repositorio.

Essa arquitetura vem antes do External Plugin Installer. Ela define onde ficam bancos, plugins externos, cache, logs e a estrutura inicial de perfis.

## Decisao Proposta

Usar `ND8_HOME` como raiz unica de dados persistentes.

Internamente, todo modulo que precisa ler ou escrever dados persistentes deve receber caminhos resolvidos a partir de `ND8_HOME`, nunca montar paths fixos para `config/data`, `server/src/plugins` ou diretorios locais do projeto.

No primeiro passo, perfis reais nao entram como feature completa. A arquitetura cria apenas o profile `default` como base futura.

## Problema Atual

Hoje o backend ainda assume caminhos do repositorio:

- Bancos SQLite ficam em `config/data`.
- Plugins internos sao carregados de `server/src/plugins`.
- Plugins instalados externamente ainda nao tem local persistente.
- `plugins.db` existe, mas ainda nao representa instalacao externa completa.
- Credentials nao tem separacao por profile.
- Docker precisaria de volume em caminho especifico, mas esse contrato ainda nao existe.
- npm precisaria salvar dados fora do pacote instalado, mas esse contrato ainda nao existe.

Isso bloqueia o External Plugin Installer porque instalar plugin em path errado quebra npm, Docker, updates e deploys.

## Novo Modelo Mental

ND8 tem uma home persistente:

```text
ND8_HOME/
  data/
  global/
  profiles/
```

`ND8_HOME` pode vir de env var.

Se nao vier, o backend resolve um default por ambiente:

- Docker recomendado: `/app/.nd8`
- Windows npm/dev: `%APPDATA%/nd8`
- macOS npm/dev: `~/Library/Application Support/nd8`
- Linux npm/dev: `~/.config/nd8`

Para desenvolvimento local, pode ser permitido fallback controlado para `config/data` apenas se isso for necessario para nao quebrar o fluxo atual. Esse fallback deve ser tratado como compatibilidade temporaria, nao como arquitetura principal.

## Estrutura Alvo

```text
ND8_HOME/
  data/
    app.db
    workflows.db
    plugins.db
    credentials.db

  global/
    plugins/
    plugin-cache/
    logs/

  profiles/
    default/
      profile.json
      workflows/
      plugin-settings.json
```

## Regras De Arquitetura

- Tudo que persiste passa por `ND8_HOME`.
- Modulos nao devem chamar `process.env.ND8_HOME` diretamente.
- Deve existir um resolver central de runtime paths.
- Database manager usa somente paths resolvidos pelo runtime.
- Plugin loader carrega plugins internos e externos por fontes separadas.
- Plugins internos continuam sendo parte do app.
- Plugins externos ficam em `ND8_HOME/global/plugins`.
- Profile `default` existe desde agora, mas nao vira feature completa.
- Credentials continuam funcionando como hoje no primeiro passo, mas a estrutura deve permitir migrar para credenciais por profile depois.
- Plugin externo nao pode sobrescrever plugin interno.
- Preview de plugin externo nao executa codigo.
- Instalar plugin externo no futuro depende dessa base pronta.

## Arquitetura Proposta

### 1. Runtime Path Resolver

Responsavel por resolver e criar a estrutura de diretorios.

Deve expor caminhos nomeados:

- `home`
- `dataDir`
- `globalDir`
- `globalPluginsDir`
- `pluginCacheDir`
- `logsDir`
- `profilesDir`
- `defaultProfileDir`
- `internalPluginsDir`

Esse modulo deve ser pequeno e testavel.

Nao deve conhecer banco, plugins, rotas ou frontend.

### 2. Database Directory Migration

O `DatabaseManager` deve parar de usar `config/data` direto.

Ele deve abrir os bancos em `ND8_HOME/data`.

Banco alvo:

- `ND8_HOME/data/app.db`
- `ND8_HOME/data/workflows.db`
- `ND8_HOME/data/plugins.db`
- `ND8_HOME/data/credentials.db`

Para evitar perda de dados em dev, o plano deve decidir como tratar bancos antigos:

- Opcao A: migracao automatica se `ND8_HOME/data` estiver vazio.
- Opcao B: sem migracao automatica, mas com aviso claro no log.

Recomendacao: Opcao A para ambiente local, com copia segura e sem apagar origem.

### 3. Runtime Bootstrap

No startup do servidor:

- resolver `ND8_HOME`;
- garantir estrutura base;
- inicializar bancos;
- carregar plugins internos;
- carregar plugins externos habilitados;
- inicializar scheduler.

O bootstrap deve logar o `ND8_HOME` resolvido, mas nao deve vazar secrets.

### 4. Plugin Source Model

Plugins passam a ter fonte.

Fontes iniciais:

- `internal`: plugins que vem com o ND8.
- `external`: plugins instalados em `ND8_HOME/global/plugins`.

O loader deve manter separacao clara:

- interno carrega de `server/src/plugins`;
- externo carrega de `ND8_HOME/global/plugins`;
- registry grava metadados no `plugins.db`.

O core pode carregar plugins. Plugin nao pode conhecer core.

### 5. Plugin Registry Upgrade

`registered_plugins` precisa guardar informacoes suficientes para instalacao externa futura.

Campos recomendados:

- id
- version
- source
- install_path
- manifest_path
- is_enabled
- installed_at
- updated_at

Para plugin interno, `install_path` pode ser nulo ou caminho interno resolvido.

Para plugin externo, `install_path` aponta para `ND8_HOME/global/plugins/<plugin-id>`.

### 6. Default Profile Skeleton

Criar `ND8_HOME/profiles/default` no bootstrap.

Arquivos iniciais:

- `profile.json`
- `plugin-settings.json`

Esse passo nao deve mudar comportamento do produto ainda.

O objetivo e reservar a estrutura para:

- workflows por profile;
- plugins habilitados por profile;
- credentials por profile;
- configs por profile.

### 7. Docker Contract

Docker deve documentar e usar:

- `ND8_HOME=/app/.nd8`
- volume persistente em `/app/.nd8`

Sem volume, o container funciona, mas dados somem quando o container for removido.

Com volume, bancos, plugins e perfis persistem.

### 8. npm Contract

Pacote npm deve resolver default home por sistema operacional.

O pacote instalado nao deve receber plugins externos dentro de `node_modules`.

Tudo que o usuario instala ou configura vai para `ND8_HOME`.

Isso evita perder dados em update de pacote.

## Plano De Tasks

### Task 1 - Mapear estado atual e travar contrato do ND8_HOME

- [x] Confirmar todos os lugares que gravam dados persistentes hoje.
- [x] Confirmar todos os lugares que leem plugins pelo filesystem.
- [x] Confirmar quais bancos SQLite existem e quem abre cada um.
- [x] Registrar no plano quais paths antigos serao substituidos.
- [x] Commit.

### Task 2 - Criar runtime path resolver

- [x] Criar modulo server-side para resolver `ND8_HOME`.
- [x] Resolver env var `ND8_HOME` quando existir.
- [x] Resolver default por OS quando env var nao existir.
- [x] Normalizar path absoluto.
- [x] Criar helper para garantir diretorios base.
- [x] Testar Windows, macOS/Linux e env override.
- [x] Commit.

### Task 3 - Criar bootstrap da estrutura ND8_HOME

- [x] Criar `data`.
- [x] Criar `global`.
- [x] Criar `global/plugins`.
- [x] Criar `global/plugin-cache`.
- [x] Criar `global/logs`.
- [x] Criar `profiles`.
- [x] Criar `profiles/default`.
- [x] Criar `profiles/default/profile.json` se nao existir.
- [x] Criar `profiles/default/plugin-settings.json` se nao existir.
- [x] Testar idempotencia rodando bootstrap duas vezes.
- [x] Commit.

### Task 4 - Migrar DatabaseManager para ND8_HOME/data

- [ ] Trocar abertura de bancos para usar runtime path resolver.
- [ ] Garantir que migracoes continuam rodando igual.
- [ ] Garantir que WAL e foreign keys continuam aplicados.
- [ ] Adicionar log do diretorio de dados ativo.
- [ ] Testar criacao dos quatro bancos em `ND8_HOME/data`.
- [ ] Commit.

### Task 5 - Compatibilidade com bancos antigos de dev

- [ ] Detectar se `ND8_HOME/data` esta vazio.
- [ ] Detectar se existe `config/data` antigo.
- [ ] Copiar bancos antigos para `ND8_HOME/data` sem apagar origem.
- [ ] Nao sobrescrever banco novo existente.
- [ ] Logar migracao local de forma clara.
- [ ] Testar copia segura.
- [ ] Testar que segunda inicializacao nao copia de novo.
- [ ] Commit.

### Task 6 - Separar plugins internos e externos no loader

- [ ] Manter loader de plugins internos funcionando.
- [ ] Adicionar loader para `ND8_HOME/global/plugins`.
- [ ] Garantir que pasta externa vazia nao quebra startup.
- [ ] Garantir que `_template` continua ignorado nos internos.
- [ ] Garantir que plugin externo invalido nao derruba servidor.
- [ ] Testar carregamento interno.
- [ ] Testar carregamento externo fake.
- [ ] Commit.

### Task 7 - Atualizar registry de plugins

- [ ] Criar migracao para campos `source`, `install_path` e `manifest_path`.
- [ ] Marcar plugins existentes como `internal`.
- [ ] Registrar plugins internos com source `internal`.
- [ ] Registrar plugins externos com source `external`.
- [ ] Preservar `is_enabled` em updates.
- [ ] Testar migracao com banco antigo.
- [ ] Commit.

### Task 8 - Proteger conflitos entre plugin interno e externo

- [ ] Bloquear plugin externo com mesmo id de plugin interno.
- [ ] Logar erro claro quando houver conflito.
- [ ] Nao registrar o plugin externo conflitante.
- [ ] Garantir que plugin interno continua ativo.
- [ ] Testar conflito de id.
- [ ] Commit.

### Task 9 - Preparar contratos para installer futuro

- [ ] Criar servico de leitura de manifest sem executar plugin.
- [ ] Validar manifest usando o contrato existente.
- [ ] Retornar metadados necessarios para preview.
- [ ] Garantir que preview nao importa `index.ts`.
- [ ] Garantir que preview nao registra plugin no manager.
- [ ] Testar manifest valido.
- [ ] Testar manifest invalido.
- [ ] Commit.

### Task 10 - Preparar plugin settings por profile default

- [ ] Criar leitor/escritor de `profiles/default/plugin-settings.json`.
- [ ] Representar plugins habilitados no profile default.
- [ ] Nao mudar ainda a UI.
- [ ] Nao quebrar `registered_plugins.is_enabled`.
- [ ] Documentar que por enquanto registry global ainda manda no enable/disable.
- [ ] Testar leitura quando arquivo nao existe.
- [ ] Testar escrita preservando formato.
- [ ] Commit.

### Task 11 - Atualizar logs e diagnostico de startup

- [ ] Logar `ND8_HOME` resolvido.
- [ ] Logar data dir ativo.
- [ ] Logar quantidade de plugins internos carregados.
- [ ] Logar quantidade de plugins externos carregados.
- [ ] Logar plugins ignorados por erro.
- [ ] Nao logar credentials, tokens ou secrets.
- [ ] Testar mensagens principais com mocks.
- [ ] Commit.

### Task 12 - Atualizar documentacao de Docker

- [ ] Documentar `ND8_HOME=/app/.nd8`.
- [ ] Documentar volume nomeado.
- [ ] Documentar bind mount local.
- [ ] Explicar que sem volume os dados nao sobrevivem remocao do container.
- [ ] Explicar onde ficam bancos e plugins externos.
- [ ] Commit.

### Task 13 - Atualizar documentacao de npm

- [ ] Documentar default home por OS.
- [ ] Documentar override por env var `ND8_HOME`.
- [ ] Explicar que plugins externos nao ficam dentro do pacote npm.
- [ ] Explicar que updates do pacote nao apagam `ND8_HOME`.
- [ ] Commit.

### Task 14 - Regressao backend

- [ ] Rodar testes do backend.
- [ ] Rodar testes de plugins.
- [ ] Rodar testes de database/migrations.
- [ ] Subir servidor local com `ND8_HOME` temporario.
- [ ] Confirmar criacao da estrutura.
- [ ] Confirmar que plugins internos aparecem em `/plugins`.
- [ ] Commit final se houver ajuste.

### Task 15 - Preparar handoff para External Plugin Installer

- [ ] Confirmar que `ND8_HOME/global/plugins` existe.
- [ ] Confirmar que registry diferencia `internal` e `external`.
- [ ] Confirmar que manifest preview nao executa codigo.
- [ ] Confirmar que plugin externo pode ser descoberto pelo loader.
- [ ] Criar novo plano especifico para External Plugin Installer.
- [ ] Commit.

## Criterios De Aceite

- `ND8_HOME` controla todos os dados persistentes novos.
- Backend funciona com `ND8_HOME` vindo de env var.
- Backend funciona sem `ND8_HOME`, usando default por OS.
- Docker pode persistir dados montando volume em `/app/.nd8`.
- npm nao precisa escrever dentro de `node_modules`.
- Bancos SQLite sao criados em `ND8_HOME/data`.
- Estrutura `global/plugins` existe para plugins externos.
- Estrutura `profiles/default` existe para perfis futuros.
- Plugins internos continuam carregando.
- Plugins externos podem ser carregados de `ND8_HOME/global/plugins`.
- Plugin externo invalido nao derruba servidor.
- Plugin externo nao sobrescreve plugin interno.
- Preview de manifest nao executa codigo.
- Testes backend passam.

## Riscos

- Quebrar dev local ao mover bancos. Mitigacao: migracao/copia segura de `config/data`.
- Misturar plugin interno e externo com mesmo id. Mitigacao: interno tem prioridade e externo conflitante e bloqueado.
- Loader executar codigo durante preview. Mitigacao: preview le somente manifest.
- Docker sem volume perder dados. Mitigacao: docs claras e logs indicando `ND8_HOME`.
- Perfiles entrarem cedo demais. Mitigacao: criar somente skeleton `default`, sem feature completa.
- Paths ficarem espalhados de novo. Mitigacao: nenhum modulo deve resolver `ND8_HOME` fora do runtime path resolver.

## Notas Para Implementacao

- TDD por task.
- Commits pequenos.
- Nao implementar External Plugin Installer neste plano.
- Nao implementar UI de perfis neste plano.
- Nao mover credentials para profile ainda, apenas preparar estrutura.
- Nao permitir que plugin leia fora da propria pasta.
- Nao permitir que plugin chame core, engines ou outros plugins.
- Manter plugin generico e guiado por `manifest.json`.
- Usar paths absolutos resolvidos centralmente.
- Evitar path fixo em modulo de banco, plugin loader, routes e services.

## Ordem Recomendada

1. Runtime path resolver.
2. Bootstrap de `ND8_HOME`.
3. DatabaseManager em `ND8_HOME/data`.
4. Compatibilidade com bancos antigos.
5. Loader interno + externo.
6. Registry com source/path.
7. Protecoes de conflito.
8. Manifest preview sem execucao.
9. Docs Docker/npm.
10. Regressao completa.
