# Plano de Ação: Marco 1.3 (Immersive Node UI & Data Pipeline)

Este documento detalha o planejamento arquitetural e de produto para o **Marco 1.3** do Nod8. O foco absoluto desta fase é a reformulação da Experiência do Usuário (UX) durante a edição de nós, substituindo a gaveta lateral (`Drawer`) por um Modal Imersivo de 3 Colunas.

A "regra de ouro" do Nod8 se mantém: **Genericidade e Desacoplamento**. A interface deve ser estritamente agnóstica; ela lê schemas e injeta dados, sem jamais conhecer a lógica de negócios de nenhum plugin.

---

## 🎯 1. Visão de Produto (Product Management)

A principal dor atual de ferramentas de automação na hora de debugar workflows complexos é a "cegueira de dados". O usuário configura um nó sem saber exatamente o formato do dado que está chegando nele, e não sabe o que vai sair até rodar o workflow inteiro e cruzar os dedos.

**A Solução (The 3-Pane Immersive Modal):**
Ao clicar em um nó na Canvas, a interface sairá do painel lateral apertado para uma sobreposição ampla (Modal), dividida logicamente no fluxo de tempo dos dados:

1. **Painel Esquerdo (INPUT - Passado):** "O que este nó está recebendo?" Exibe as variáveis e o JSON gerado pelos nós anteriores. **Feature Crucial de UX:** O usuário poderá arrastar (Drag & Drop) propriedades desta árvore JSON e soltar diretamente dentro dos campos de input do Painel Central, criando a sintaxe de variável `{{ ... }}` automaticamente.
2. **Painel Central (CONFIG - Presente):** "O que este nó vai fazer?" O formulário dinâmico gerado pelo `manifest.json`. **Novas Features Embutidas:**
   - **Menu de Autenticação Inline:** Uma seção nativa para configurar OAuth2, API Keys, etc. diretamente no nó, reaproveitando a lógica do nosso Global Panel, sem forçar o usuário a sair do workflow.
   - Botões de ação e execução (ex: *"Test Step"* / *"Listen for Event"*).
3. **Painel Direito (OUTPUT - Futuro):** "O que este nó gerou?" O resultado visual da execução isolada deste nó, exibindo sucesso (JSON/Buffers) ou os Erros capturados na hora.

---

## 🏗️ 2. Arquitetura Frontend (Senior Frontend Developer)

Para manter o código limpo, testável e escalável, a refatoração seguirá princípios rigorosos de componentização moderna usando Vue 3 (Composition API).

### 2.1. Estrutura de Componentes
O antigo `NodeEditorDrawer.vue` será obsoleto. Criaremos uma estrutura modular focada nesse novo inspetor:

```text
src/features/workflow-editor/components/settings/
├── NodeInspectorModal.vue         # Componente pai, orquestra o layout CSS Grid de 3 colunas
├── inspector-panes/
│   ├── InspectorInputPane.vue     # Renderiza a árvore JSON de entrada (Habilitada para Drag Events)
│   ├── InspectorConfigPane.vue    # Wrapper central para os editores já existentes (PluginEditor, etc)
│   └── InspectorOutputPane.vue    # Renderiza o resultado da execução (Sucesso/Erro)
└── shared/
    ├── JsonTreeView.vue           # Componente genérico/recursivo para renderizar JSONs colapsáveis
    └── InlineAuthManager.vue      # Componente embutido para gerenciar credenciais do plugin diretamente no nó
```

### 2.2. Gerenciamento de Estado (Pinia)
Para evitar o antipadrão de *Prop Drilling* (passar propriedades por 5 níveis de componentes), o estado efêmero do modal será isolado:
*   **State (`node-inspector.store.ts`):** 
    *   `inspectingNodeId`: Qual nó está aberto no momento.
    *   `lastTestOutput`: O resultado (JSON ou string de erro) da última vez que o usuário clicou em "Test Step".
    *   `isTesting`: Booleano para travar a UI e exibir *skeleton loaders* enquanto o backend processa o teste isolado.
    *   `draggedVariablePath`: Estado HTML5 Drag/Drop para rastrear qual string de variável está sendo transportada do Painel Esquerdo para o input do Painel Central.

### 2.3. Transição Suave e Reaproveitamento
*   Os editores vitais e complexos (`PluginEditor.vue`, `HttpEditor.vue`, `CodeEditor.vue`) **não sofrerão grandes refatorações lógicas**. Eles já são perfeitamente agnósticos. Serão apenas movidos para dentro do `InspectorConfigPane.vue` e receberão ajustes de CSS para preencherem o container flexível de forma elegante.
*   A autenticação será uma mera importação do componente/store existente adaptado para o novo espaço (`InlineAuthManager.vue`), agilizando o desenvolvimento.

---

## ⚙️ 3. Arquitetura Backend (Test Step Execution)

Para que o botão "Test Step" funcione, o Backend precisa de uma forma de executar um único nó isoladamente, alimentando-o com dados simulados ou do histórico, sem sujar o estado real de produção.

### 3.1. Novo Endpoint na Engine
`POST /workflows/:workflowId/nodes/:nodeId/execute`
*   **Request Body:** O estado atual modificado pelo usuário na UI (os parâmetros editados no formulário, mesmo que ainda não salvos definitivamente no workflow principal).
*   **Lógica do Core (Desacoplada):**
    1. O `WorkflowEngine` identifica os nós anteriores (`upstream`).
    2. Resolve as variáveis `{{ ... }}` do input atual baseado no cache das últimas execuções.
    3. Entrega o payload para o Executor genérico (ex: `PluginExecutor.execute(pluginId, method, resolvedParams)`).
*   **Response:** Retorna o output exato e puro (status 200) ou um erro formatado se a API externa falhar.
*   **O Segredo da Escalabilidade:** O Plugin não precisa de código extra de "modo de teste". A Engine orquestra o input, executa o método padrão do plugin e devolve a resposta.

---

## 🛣️ 4. Cronograma de Execução

Esta fase será metódica para não quebrar a estabilidade conquistada no Marco 1.2:

*   **Step 1: O Esqueleto Visual (Frontend)**
    *   Construir o componente base `NodeInspectorModal.vue` com Backdrop e Grid de 3 colunas (ocupando ~90% da tela).
    *   Migrar os componentes do Drawer antigo para a Coluna Central do Modal, garantindo que o bind reativo (`updateNodeData`) continue fluindo.
*   **Step 2: Experiência de Usuário e Visualização (Frontend)**
    *   Desenvolver o `JsonTreeView.vue` estilizado (cores diferentes para tipos primitivos) com suporte à API HTML5 nativa de `dragstart` nas propriedades.
    *   Implementar o `InlineAuthManager.vue` no Painel Central (em cima do `PluginEditor`), exibindo a luz indicadora de Status (Conectado/Desconectado) e o botão OAuth.
    *   Mockar as colunas Esquerda e Direita com dados estáticos para validação do design e do Drag and Drop.
*   **Step 3: Isolamento de Execução (Backend)**
    *   Criar o endpoint `/nodes/:nodeId/execute` na API do Fastify.
    *   Isolar a lógica de execução unitária no `executor.ts`, separando-a do loop iterativo da máquina de estados do workflow principal.
*   **Step 4: Integração Final (A Mágica)**
    *   Acoplar o botão "Test Step" do Painel Central à requisição assíncrona do Backend.
    *   Injetar a resposta do Backend diretamente no `JsonTreeView` da Coluna Direita, completando a ponte entre Configuração e Resultado Real.
