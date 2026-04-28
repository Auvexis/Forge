# Refactoring Database Architecture & Migrations

**Objetivo:** Refatorar a engine do servidor para suportar múltiplos bancos de dados SQLite com controle rigoroso de migrations, preparando o terreno para a plataforma Nod8 crescer sem gargalos estruturais.

## Tarefas a Executar:

- [x] **1. Setup do Database Manager**
  - Criar `server/src/core/database/manager.ts`.
  - Configurar instâncias separadas para `app`, `workflows`, `plugins` e `credentials`.
  - Garantir o PRAGMA `journal_mode = WAL` e `foreign_keys = ON` em todas as conexões.

- [x] **2. Criação da Engine de Migrations (Umzug)**
  - Instalar `umzug` via npm.
  - Criar `server/src/core/database/migration-engine.ts`.
  - Configurar a engine Umzug para ler arquivos `.ts/.js` nas pastas de migrations.
  - Garantir que a engine gerencie a tabela `_migrations` em cada banco de dados.

- [x] **3. Escrever Migrations para Workflows**
  - Mapear a criação da tabela `workflows` (com a coluna `is_draft` nativamente).
  - Mapear a criação da tabela `workflow_executions`.

- [x] **4. Escrever Migrations para Credentials**
  - Mapear a criação de `plugin_credentials`.
  - Mapear a criação de `plugin_tokens`.

- [x] **5. Refatorar Repositórios Existentes**
  - Atualizar `server/src/core/modules/workflows/repository.ts` para usar o Database Manager (`db.workflows`).
  - Atualizar `server/src/core/modules/plugins/credential-store.ts` para usar o Database Manager (`db.credentials`).

- [x] **6. Estruturar Configuração e Registro de Plugins**
  - Criar a migration base para `app.db` (tabela de `settings`).
  - Criar a migration base para `plugins.db` (tabela de `registered_plugins` contendo `id, version, is_enabled`).
  - Adaptar o loader (`server/src/core/modules/plugins/loader.ts`) para cruzar os dados lidos das pastas com o status do banco.

- [x] **7. Limpeza e Teste**
  - Deletar o antigo `server/src/core/database.ts`.
  - Inicializar o servidor e verificar a criação dos 4 arquivos `.db` dentro de `config/data/`.
  - Testar execução de fluxos e salvamento de credenciais para garantir que a transição ocorreu sem perda de funcionalidade.
