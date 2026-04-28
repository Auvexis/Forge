# Nod8 Database Architecture & Migration Plan

## 1. Visão Geral da Arquitetura
A atual engine do Nod8 utiliza `better-sqlite3` com instâncias hardcoded separadas (`database.ts` e `credential-store.ts`) e migrations baseadas em `try/catch` (`ALTER TABLE`). Os plugins são lidos dinamicamente da pasta `plugins/` e guardados em memória.

Para garantir que o sistema escale, suporte novos desenvolvedores e mantenha o foco "Genérico e Agnóstico", precisaremos implementar um **Database Manager** centralizado, um **Migration Engine** robusto, e estruturar os dados em **Múltiplos Bancos de Dados**.

## 2. Separação dos Bancos de Dados
Os arquivos de banco de dados ficarão dentro de `config/data/` com a extensão `.db`, todos operando com **WAL (Write-Ahead Logging)** para máxima performance de leitura/escrita concorrente.

1. **`app.db`**: Configurações globais, preferências do usuário e metadados do servidor.
2. **`workflows.db`**: As tabelas `workflows` e `workflow_executions`. Os nós do fluxo e o contexto de execução continuarão sendo salvos como colunas do tipo `JSON` para garantir a característica genérica do sistema.
3. **`plugins.db`**: Registro de plugins instalados, seus status (`is_enabled`), versão e path. Isso permitirá ativar/desativar plugins pela UI sem precisar apagar a pasta deles.
4. **`credentials.db`**: Credenciais de plugins, OAuth2 tokens e secrets (já existe, mas será incorporado na nova arquitetura).

## 3. O "Migration Engine" (via Umzug)
Para garantir robustez e padronização, utilizaremos a biblioteca **Umzug** como motor de migrations. Ela é agnóstica a banco de dados e permite gerenciar o ciclo de vida das migrations de forma programática.

**Como vai funcionar:**
1. **Engine**: O Umzug será instanciado para cada banco de dados (`app`, `workflows`, etc).
2. **Storage**: Utilizaremos um storage customizado (ou o nativo para JSON/Sequelize, adaptado para `better-sqlite3`) para persistir o histórico na tabela `_migrations`.
3. **Scripts**: As migrations serão escritas em TypeScript/JavaScript dentro de `server/src/core/database/migrations/{dbName}/`.
4. **Execução**: No boot da aplicação, o *Database Manager* invocará o método `up()` do Umzug para garantir que o schema esteja atualizado antes de liberar as conexões.

Isso nos dá suporte nativo a transações, logs de execução e reversão (down) de forma profissional, eliminando a necessidade de scripts manuais frágeis.

## 4. O "Database Connection Manager"
Substituir o `export const db = new Database(...)` hardcoded.
Criaremos a classe `DatabaseManager` em `server/src/core/database/manager.ts` que exporta instâncias nomeadas:
- `db.workflows`
- `db.plugins`
- `db.credentials`
- `db.app`

Isso permite que repositórios (`WorkflowRepository`, `CredentialStore`) peçam a conexão correta no momento de instanciar ou na execução, em vez de conectarem diretamente no disco.

## 5. Fases de Implementação (Roadmap)

### Fase 1: Fundação do Database Manager e Migrations
1. Instalar dependências: `npm install umzug`.
2. Criar o diretório `server/src/core/database/`.
3. Criar a classe de gerenciamento `manager.ts` que inicializa o `better-sqlite3` e aplica o pragma WAL.
4. Configurar o helper de migrations em `migration-engine.ts` utilizando o **Umzug**, configurado para buscar arquivos no diretório de migrations de cada DB.

### Fase 2: Refatorar Bancos Existentes (Workflows e Credentials)
1. Escrever o script de migration `001_initial_workflows.ts` contendo as tabelas `workflows` e `workflow_executions`.
2. Escrever o script de migration `001_initial_credentials.ts` contendo `plugin_credentials` e `plugin_tokens`.
3. Atualizar o `WorkflowRepository` e `CredentialStore` para consumirem as instâncias via `DatabaseManager`.
4. Deletar `server/src/core/database.ts` legado.

### Fase 3: Novos Bancos (Plugins e App Config)
1. Criar `app.db` com migrations para a tabela de `settings` (chave-valor JSON).
2. Criar `plugins.db` com migrations para a tabela `registered_plugins`.
3. Atualizar o `loader.ts` para sincronizar os arquivos lidos do disco (manifest.json) com o banco de dados `plugins.db`, gerenciando instalação e ativação.

## 6. O Desafio do Sistema Genérico (Manter o Core Limpo)
Para que a arquitetura continue aceitando **QUALQUER** tipo de configuração, os bancos continuarão usando o padrão Híbrido:
- **Colunas Relacionais**: Para indexação, busca e ordenação rápida (Ex: `id`, `name`, `status`, `created_at`, `workflow_id`).
- **Colunas JSON**: Para guardar as definições arbitrárias de Plugins (parâmetros obscuros) e Workflows (nodes de lógica imprevisível).

Isso protege a arquitetura de ter que rodar uma migration toda vez que um desenvolvedor criar um plugin com uma propriedade nova no futuro.
