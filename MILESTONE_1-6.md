# Nod8: Milestone 1.6 - Plugin Triggers & Event-Driven Architecture

## 🎯 Objetivo Principal
Evoluir o sistema de gatilhos (Triggers) do Nod8, saindo de webhooks genéricos e manuais para uma experiência mágica e específica de aplicativos (App-Specific Triggers). O desenvolvedor do plugin deve conseguir registrar/desregistrar webhooks automaticamente nas APIs de terceiros, e o usuário final deve ter uma experiência fluida para capturar dados ("Listen for Event") e mapeá-los visualmente.

**Princípio Arquitetural Chave:** A lógica do plugin **NUNCA** deve vazar para o core do Nod8. O Core Engine apenas orquestra chamadas de ciclo de vida (`setup`, `teardown`) e provê as URLs e credenciais. O plugin é 100% responsável por saber como falar com o Telegram, Stripe, etc.

---

## 🏗️ Tarefa 1: Evolução do `WorkflowTrigger` e Schema de Plugins

Precisamos introduzir o conceito de "Plugin Trigger" no sistema, permitindo que os plugins declarem gatilhos assim como declaram métodos (actions).

### 1.1 Atualização dos Tipos Compartilhados (`shared/models/plugin-types.ts`)
Vamos expandir o manifesto e a interface do plugin para suportar gatilhos.

```typescript
// Em plugin-types.ts

// Contexto injetado quando o engine chama setup/teardown
export interface TriggerRegistrationContext {
  webhookUrl: string; // A URL pública gerada pelo Nod8 para receber o webhook
  credentials: Record<string, string>;
  tokens?: OAuth2Tokens;
  params: Record<string, any>; // Parâmetros configurados no nó de trigger pelo usuário
}

export interface PluginTriggerManifest {
  metadata: {
    label: string;
    description: string;
  };
  parameters?: JSONSchemaObject; // Parâmetros do gatilho (ex: quais eventos escutar)
  ui?: any;
}

export interface PluginManifest {
  metadata: PluginMetadata;
  methods: Record<string, PluginMethodManifest>;
  triggers?: Record<string, PluginTriggerManifest>; // Novo!
}

export interface Nod8Plugin {
  id: string;
  manifest: PluginManifest;
  auth: CredentialProvider;
  methods: Record<string, (params: any, context?: PluginContext) => Promise<any>>;
  // Novos hooks opcionais de ciclo de vida do trigger
  triggers?: Record<string, {
    setup: (context: TriggerRegistrationContext) => Promise<void>;
    teardown: (context: TriggerRegistrationContext) => Promise<void>;
  }>;
}
```

### 1.2 Atualização do Tipo de Trigger (`shared/models/workflow-types.ts`)
```typescript
// Adicionar "plugin" aos tipos de trigger
export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "event" | "plugin"; // Adicionado "plugin"
  
  // ... campos existentes ...

  // Novos campos para Plugin Triggers
  pluginId?: string;
  triggerName?: string;
  triggerParams?: Record<string, any>;
}
```

---

## ⚙️ Tarefa 2: Gerenciamento de Ciclo de Vida no Core Backend

O Core Engine precisa orquestrar o `setup` e `teardown` dos webhooks de plugins automaticamente quando o status de um workflow mudar.

### 2.1 Módulo `WorkflowLifecycleManager` (Novo)
Criar `server/src/core/modules/workflows/lifecycle.ts` para lidar com a ativação/desativação de workflows de forma isolada do repositório básico.

*   **Ao Ativar Workflow (Publish/Enable):**
    *   Se `trigger.type === "plugin"`, buscar as credenciais via `CredentialStore`.
    *   Resolver variáveis globais (Vault).
    *   Gerar a `webhookUrl` completa (ex: `https://nod8.app/webhook/wh_abc123`).
    *   Chamar `PluginManager.getPlugin(id).triggers[name].setup(context)`.
    *   Se o `setup` falhar, abortar a ativação do workflow e retornar erro.
*   **Ao Desativar/Deletar Workflow (Draft/Disable):**
    *   Chamar o `.teardown(context)` para limpar a inscrição na API 3rd-party.

### 2.2 Refatoração em `workflows.routes.ts`
*   No `POST /workflows` e `PUT /workflows/:workflowId`, ao invés de apenas chamar `WorkflowRepository.saveWorkflow()`, devemos chamar as funções do `WorkflowLifecycleManager` se a flag `isActive` estiver mudando.

---

## 🎧 Tarefa 3: "Listen for Event" e Dynamic Outputs (Backend)

O usuário clica em "Listen for Event", e o Nod8 fica esperando a próxima chamada webhook para popular o painel esquerdo (Input) de forma *schema-less*.

### 3.1 Endpoint Interceptor de Eventos
*   Adicionar rota: `GET /workflows/:workflowId/trigger/listen`.
*   Esta rota abrirá uma conexão **SSE (Server-Sent Events)** com o client-vue.
*   No backend, registrar o `workflowId` num `TriggerListenerRegistry` em memória.

### 3.2 Modificação na Rota de Webhook (`webhooks.routes.ts`)
Quando a rota genérica de webhook (ou `/webhook/:webhookPath`) receber um POST:
1.  Verificar se o workflow atrelado a este `webhookPath` está atualmente no modo "Listening" (registrado no `TriggerListenerRegistry`).
2.  **Se estiver "Listening":**
    *   **NÃO** executa o workflow.
    *   Salva o payload (body, headers) no banco de dados como o `lastTestTriggerData` do workflow.
    *   Emite o payload pelo SSE para o frontend.
    *   Desregistra o workflow do modo "Listening".
    *   Retorna `200 OK` rápido para a API 3rd-party.
3.  **Se NÃO estiver "Listening":**
    *   Segue o fluxo normal (`WorkflowEngine.executeWorkflow`).

---

## 🖥️ Tarefa 4: UI/UX no Workflow Editor (Frontend `client-vue`)

O Frontend deve prover a experiência mágica prometida sem gambiarras de CSS ou gerenciamento de estado complexo.

### 4.1 `TriggerEditor.vue` (UI do Node Settings)
*   Adicionar a opção de selecionar um Trigger de Plugin no dropdown "Trigger Type".
*   Quando `type === "plugin"`, renderizar dinamicamente o formulário usando o `TriggerEditor.vue` (reaproveitando a lógica de renderização de formulários do `PluginEditor.vue`).
*   Adicionar o botão animado **"Listen for Event"**.
    *   Ao clicar: Mostrar um spinner com "Waiting for event...". Chamar a API SSE.
    *   O usuário vai até o app (ex: Telegram) e envia uma mensagem para o bot.
    *   O evento chega no SSE, o botão fica verde ("Event Captured!").

### 4.2 Left Pane (Input) no `NodeInspectorModal.vue`
*   **Schema-less:** O `TriggerNode` geralmente não tem um JSON Schema restrito de output (cada webhook envia algo diferente).
*   No Left Pane (`VariableTree.vue`), quando o nó for o Trigger, devemos carregar os dados brutos capturados pelo "Listen for Event" (salvos na estrutura do workflow).
*   O payload recebido no "Listen" torna-se a base da árvore de dados que pode ser arrastada ou copiada (ex: `{{ trigger.body.message.text }}`).

---

## 🧹 Checklist de Padrões e Qualidade (Sem Gambiarras)

1.  **Separação Core vs Plugin:** O `workflows.routes.ts` não deve ter "if (plugin === 'telegram')". A comunicação será estritamente feita pelo contrato do `Nod8Plugin`.
2.  **Tratamento de Erros no Setup:** APIs externas caem. O `LifecycleManager` deve capturar `try/catch` no `setup()` e refletir no UI caso não seja possível registrar o webhook (ex: "Token inválido").
3.  **Reaproveitamento de Componentes Vue:** O formulário de configuração do plugin trigger deve usar as mesmas estruturas (ex: `BaseInput`, `BaseSelect`, `VisibleIf` logic) já validadas no `PluginEditor.vue`.
4.  **Isolamento de Estado:** O status de "Listening" do trigger de um usuário não deve afetar a execução de workflows em produção. O `webhooks.routes.ts` deve checar o registry em memória com alta eficiência.

---

Este documento guia a implementação limpa e profissional da Milestone 1.6, mantendo o Nod8 escalável e pronto para o ecossistema de desenvolvedores da Phase 2.
