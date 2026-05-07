# 🚀 MILESTONE 1.7: Engine Evolution & Advanced Nodes

## 🎯 Objetivo e Diretrizes Arquiteturais
Este documento detalha o plano de implementação da Milestone 1.7. O foco absoluto é entregar **segurança, estabilidade e escalabilidade**, mantendo a manutenção simples e o código menos suscetível a bugs. 

**Regra de Ouro (Zero Gambiarras):** O Nod8 é um sistema agnóstico. A lógica do Core da Engine (ex: `executor.ts`) **NÃO VAZA** para os plugins, e a lógica dos plugins **NÃO VAZA** para o Core. 
- Nós estruturais (Switch, Merge, Multiple Triggers) afetam a engine e serão construídos no Core (`server/src/core/modules/workflows/executor.ts`).
- Nós utilitários (Date/Time, Crypto, Compare) são puramente manipulação de dados e devem ser tratados como **Plugins Internos/Nativos** (implementados sob a interface de plugin, isolados da engine de workflow).

---

## 📌 1. Suporte a Múltiplos Triggers (Prioridade Máxima)
A capacidade de iniciar o mesmo workflow por diferentes gatilhos (Webhook OU Form Trigger OU Cron) exige uma refatoração no ponto de entrada do executor.

### Arquitetura & Implementação Segura
*   **Modelagem (Shared):** Atualizar `WorkflowItem` para que não haja mais um acoplamento estrito e hardcoded a apenas um único nó `"trigger"`.
*   **Engine (`executor.ts`):** 
    *   Remover a suposição de que há apenas um nó "trigger" iniciando a fila de execução. O BFS precisa ser capaz de iniciar do nó Trigger específico que disparou o evento.
    *   O contexto `context.trigger` deve refletir de forma dinâmica *qual* trigger iniciou a execução atual, permitindo que o usuário saiba a origem exata dos dados.
*   **Frontend (`client-vue`):**
    *   Permitir arrastar múltiplos nós do tipo "Trigger" para o canvas.
    *   Validar visualmente se ao menos um Trigger está conectado ao resto do fluxo.

---

## 🛠️ 2. Nós Estruturais Essenciais (Core Engine)
Estes nós controlam o fluxo de dados (Data Flow Routing) e exigem modificações diretas no `executor.ts` e na interface Vue Flow.

### ✏️ Set (Edit Fields)
*   **Objetivo:** Renomear chaves JSON ou adicionar dados fixos visualmente, sem Javascript.
*   **Implementação:** Implementado como um nó nativo `SetNode`. O executor avalia os templates (usando `WorkflowParser.evalParams`) e injeta os valores desejados. Sendo um nó core, é leve, seguro e não acarreta dependências externas.

### 🔲 Switch
*   **Objetivo:** Roteamento de múltiplos caminhos (N outputs) baseado em condições de valores, substituindo múltiplos `IfNodes`.
*   **Implementação:** 
    *   **Model:** Adicionar `SwitchNode` suportando N condições.
    *   **Engine:** No `executor.ts`, o tratador do switch avaliará a condição correspondente (ex: executando para a aresta `case_1`, `case_2`, ou `fallback`).
    *   **Segurança:** Apenas a aresta (edge) conectada ao `sourceHandle` correspondente à condição verdadeira terá seu caminho continuado na fila de execução, ignorando as demais ramificações sem sobrecarregar a memória.

### 🔌 Merge
*   **Objetivo:** Juntar fluxos paralelos (após IF ou Switch) de volta para uma linha única.
*   **Implementação:**
    *   **Engine:** Um nó passivo. A Engine já lida com inDegree (grau de entrada), mas o Merge Node precisa de lógicas claras (ex: Wait Any, Wait All).
    *   **Cuidado Arquitetural:** Modificar a liberação de nós no BFS/Fila do `executor.ts` para que fluxos independentes não causem execuções duplas (racing conditions) caso cruzem o mesmo Merge Node simultaneamente.

### 🔀 Split In Batches / Item Lists
*   **Objetivo:** Dividir grandes arrays em lotes para contornar rate limits de APIs de terceiros.
*   **Implementação:**
    *   **Engine:** Estruturalmente similar ao `LoopNode`, porém com controle de state de paginação no contexto da execução.
    *   **Estabilidade:** Controle rígido de limites e iterações (max batches) para evitar vazamento de memória ou travamento de CPU (Event Loop block).

---

## 🧰 3. Nós Utilitários (Utility Nodes - Implementação em Plugin Isolado)
Esses nós **não alteram** a arvore de decisão da engine, apenas manipulam dados no contexto. Para respeitar as Boas Práticas do Nod8, eles **DEVEM** ser construídos utilizando a mesma infraestrutura que criamos para plugins (via Manifest e Action Methods), mantendo o `executor.ts` totalmente alheio à sua existência.

### 📝 Form (Form Trigger)
*   **Arquitetura:** O Trigger hospeda um endpoint (ex: `/api/forms/execute/:id`). Ao receber um POST limpo e validar os campos, ele aciona o executor do Workflow informando ser a porta de entrada.
*   **Segurança:** Adicionar proteção contra spam (Rate Limit) e sanitização rigorosa de XSS/Injections nos inputs.

### ⏳ Wait / Sleep
*   **Arquitetura:** 
    *   **Pausas curtas (Segundos):** Promises encadeadas no backend.
    *   **Pausas longas (Até Data Específica):** Requer serializar a execução no banco (`status: PAUSED`) e acordar usando o `scheduler.ts` do core. Complexidade de escala alta. Deve ser feito com máxima precaução no desacoplamento.

### 📅 Date & Time
*   **Arquitetura:** Plugin construído por cima de uma biblioteca robusta e leve (ex: `dayjs`). Converte Timezones, formata strings de data e faz cálculos matemáticos com dias. Zero risco, lógica isolada.

### 🔐 Crypto / Hash
*   **Arquitetura:** Plugin envelopando o módulo nativo `crypto` do Node.js. Geração de UUIDs, SHA256, HMAC e Base64. Completamente desacoplado, lidando apenas com manipulação do Input JSON.

### ⚖️ Compare Datasets
*   **Arquitetura:** Plugin de array manipulation. Processa e devolve a diferença ou intersecção entre List A e List B. Leve e performático.

### 📩 Respond to Webhook
*   **Arquitetura:** 
    *   **Sem Gambiarra:** O Trigger original HTTP passa um `requestCorrelationId` para o contexto. 
    *   O Webhook Trigger usa o Event Bus interno para aguardar um evento específico (ex: `once('webhook-response-xyz')`).
    *   O Nó "Respond to Webhook" emite esse evento com o payload final e o HTTP Response Code.
    *   Mantemos assim a engine assíncrona, e o express HTTP Response Object não trafega pelas entranhas do Executor.

### 💾 Read / Write File
*   **Arquitetura:** Plugin que manipula File System.
*   **Segurança Máxima:** Chroot / Diretório Controlado. O plugin só deve ter acesso a um diretório temporário (`/workspace/data/:workflowId`). Qualquer tentativa de acessar `/etc/passwd` ou `../../` deve resultar em erro imediato.

---

## 🚀 Ordem de Execução Sugerida

1.  **Fase 1: Engine Foundation**
    *   Refatoração do Suporte a Múltiplos Triggers (Core).
    *   Implementação do Nó Switch e Nó Merge (Core).
2.  **Fase 2: Utilitários Independentes (Low Hanging Fruits)**
    *   Construção dos Plugins Nativos: `Date & Time`, `Crypto`, e `Compare Datasets`.
    *   Implementação do `Set (Edit Fields)`.
3.  **Fase 3: I/O & Assincronismo Avançado**
    *   `Form Trigger`.
    *   `Respond to Webhook` (Event Bus refactor).
    *   `Read / Write File` (Com isolamento / Jail).
4.  **Fase 4: Controle de Estado Longo**
    *   `Split In Batches`.
    *   `Wait / Sleep` prolongado (Pausar e Resumir fluxo persistido).

---
*Pronto para iniciar a Fase 1 quando desejar.*
