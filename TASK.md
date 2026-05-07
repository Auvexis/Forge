# TASK.md — Milestone 1.7: Advanced Utility Nodes

> **Regra de Ouro**: A cada fase concluída e testada → commit + marcar como `[x]`.
> Nenhum código core vaza para plugins. Nenhum código de plugin vaza para o core.

---

## 📐 Análise Arquitetural (Base de decisão)

### Como o sistema funciona hoje

| Camada | Arquivo-chave | Responsabilidade |
|--------|---------------|-----------------|
| **Tipos Compartilhados (server)** | `shared/models/workflow-types.ts` | Union discriminada `WorkflowNode`, interface `WorkflowItem`, `WorkflowTrigger` |
| **Tipos Compartilhados (client)** | `core/types/workflow.types.ts` | Espelho do server — precisa de sync manual |
| **Engine Core** | `core/modules/workflows/executor.ts` | BFS topológico, `executeNode()` dispatcher, loop sub-graph |
| **Plugin Executor** | `core/modules/plugins/executor.ts` | Resolve credenciais, valida params via AJV, chama `methods[action]()` |
| **Plugin Loader** | `core/modules/plugins/loader.ts` | Descoberta recursiva de `index.ts`, valida manifest, registra no DB |
| **Validação de Rota** | `core/routes/workflows.routes.ts` | `VALID_NODE_TYPES` Set + `validateWorkflowDefinition()` por switch |
| **Canvas Vue** | `features/workflow-editor/components/Nod8WorkflowCanvas.vue` | `NODE_DEFAULT_NAMES`, `addLogicNode()`, registro de node-components no VueFlow |
| **Add Node Panel** | `components/settings/AddNodePanel.vue` | `LOGIC_NODES` array — lista o que aparece no menu "adicionar nó" |
| **Editor Registry** | `components/settings/editors/index.ts` | `NODE_EDITOR_REGISTRY` — mapeia type → componente Vue do inspetor |
| **CSS Tokens de Nós** | `assets/` / CSS variables | `--nod8-node-<type>-icon/bg/border` por tipo de nó |

### Critério de classificação dos novos nós

```
Nó altera o FLUXO DE EXECUÇÃO (quais próximos nós rodam)?
├── SIM → Nó Estrutural: requer adição no executor.ts, workflow-types.ts, VALID_NODE_TYPES, validação de rota, Vue component + editor
└── NÃO → Nó Utilitário: implementar como Plugin Nativo (manifest.json + methods.ts); o executor.ts não sabe da sua existência
```

| Nó | Classificação | Justificativa |
|----|---------------|---------------|
| **Switch** | 🔴 Estrutural | N outputs, BFS precisa saber qual handle ativar |
| **Merge** | 🔴 Estrutural | Aguarda múltiplos fluxos convergentes — afeta in-degree |
| **Set (Edit Fields)** | 🔴 Estrutural | Inline, sem side-effects externos; mais simples como nó core que usa `WorkflowParser.evalParams` nativamente |
| **Split In Batches** | 🔴 Estrutural | Variante do Loop — controla estado de paginação no executor |
| **Date & Time** | 🟢 Plugin Nativo | Pura manipulação de dados; zero acesso a fluxo de controle |
| **Crypto / Hash** | 🟢 Plugin Nativo | Pura manipulação de dados usando `node:crypto` nativo |
| **Compare Datasets** | 🟢 Plugin Nativo | Pura manipulação de arrays |
| **Wait / Sleep** | 🟡 Semi-estrutural | Pausas curtas → Promise no executor; pausas longas → futuro (fora do escopo desta milestone) |
| **Respond to Webhook** | 🔴 Estrutural | Requer correlacionar HTTP response com execução em andamento via `requestId` |
| **Read / Write File** | 🟢 Plugin Nativo | Acesso ao FS em diretório sandboxed; sem impacto no fluxo |
| **Form (Form Trigger)** | 🟡 Trigger especial | Novo `trigger.type`; requer rota HTTP + página HTML hospedada |

---

## 🗂️ Fases de Implementação

### FASE 1 — Nós Estruturais: Set & Switch
> **Pré-requisito**: Nenhum. Começamos aqui.
> **Critério de conclusão**: Workflows com Set e Switch salvam, executam e roteiam corretamente.

- [ ] **1.1** — `server/src/shared/models/workflow-types.ts`: Adicionar `SetNode` e `SwitchNode` à union `WorkflowNode` e ao tipo `WorkflowNodeType`
  - `SetNode`: `{ type: "set"; assignments: Array<{ key: string; value: string }> }`
  - `SwitchNode`: `{ type: "switch"; inputExpression: string; cases: Array<{ value: string; handleId: string }>; fallbackHandleId?: string }`

- [ ] **1.2** — `client-vue/src/core/types/workflow.types.ts`: Sincronizar os mesmos tipos com o server (espelho manual)

- [ ] **1.3** — `server/src/core/modules/workflows/executor.ts`:
  - Adicionar `executeSetNode()`: itera `assignments`, avalia cada `value` via `WorkflowParser.evalParams`, injeta no contexto `context.steps[nodeId].output`
  - Adicionar `executeSwitchNode()`: avalia `inputExpression` contra o contexto, faz match no array `cases`, retorna `{ activeHandle: string }` 
  - Adicionar ambos no dispatcher `executeNode()` switch-case
  - Adicionar lógica de release de edges no BFS principal para o Switch (similar ao `if`): apenas o handle correspondente a `activeHandle` libera seus nós destino

- [ ] **1.4** — `server/src/core/routes/workflows.routes.ts`:
  - Adicionar `"set"` e `"switch"` ao `VALID_NODE_TYPES` Set
  - Adicionar casos de validação em `validateWorkflowDefinition()`:
    - `set`: requer `assignments` como array não-vazio
    - `switch`: requer `inputExpression` string e `cases` array não-vazio

- [ ] **1.5** — Frontend — Novo Vue component `SetNode.vue` em `components/nodes/`:
  - Visual similar ao `IfNode.vue` com ícone `sliders-horizontal`, usando CSS tokens `--nod8-node-set-*`
  - Handle único de saída `source` (output padrão)

- [ ] **1.6** — Frontend — Novo Vue component `SwitchNode.vue` em `components/nodes/`:
  - Renderiza N handles de saída dinamicamente baseado em `data.cases`
  - Handle de fallback opcional
  - Visual com ícone `git-branch-plus`, CSS tokens `--nod8-node-switch-*`

- [ ] **1.7** — Frontend — Novo editor `SetEditor.vue` em `components/settings/editors/`:
  - Lista de pares `key: value` com add/remove dinâmico
  - Suporte a `{{ template }}` nos valores (textarea por campo)
  - Integra com `injectVariable` prop para Variable Tree

- [ ] **1.8** — Frontend — Novo editor `SwitchEditor.vue` em `components/settings/editors/`:
  - Campo `inputExpression` (o valor a ser avaliado)
  - Lista dinâmica de `cases`: valor esperado + identificador do handle (ex: `case_0`, `case_1`)
  - Campo `fallbackHandleId` opcional

- [ ] **1.9** — `Nod8WorkflowCanvas.vue`: Registrar `SetNode` e `SwitchNode` nos templates `#node-set` e `#node-switch`; adicionar ao `NODE_DEFAULT_NAMES` e ao `addLogicNode()` defaults

- [ ] **1.10** — `AddNodePanel.vue`: Adicionar Set e Switch ao array `LOGIC_NODES`

- [ ] **1.11** — `editors/index.ts`: Mapear `set → SetEditor` e `switch → SwitchEditor` no `NODE_EDITOR_REGISTRY`

- [ ] **1.12** — CSS tokens: Adicionar `--nod8-node-set-*` e `--nod8-node-switch-*` no arquivo de variáveis global

- [ ] **1.13** — ✅ **TESTE & COMMIT**: Criar workflow com Set → Switch → múltiplos destinos. Validar que apenas o handle correto executa. Commitar.

---

### FASE 2 — Nó Estrutural: Merge
> **Pré-requisito**: Fase 1 concluída.
> **Critério de conclusão**: Fluxos paralelos convergem no Merge sem execução duplicada.

- [ ] **2.1** — `workflow-types.ts` (server + client): Adicionar `MergeNode`
  - `{ type: "merge"; mode: "wait-any" | "wait-all" }` 
  - `wait-any`: executa assim que qualquer branch chegar (comportamento padrão do BFS atual, com ajuste)
  - `wait-all`: aguarda todos os branches chegarem antes de liberar (requer contagem de in-degree resolvidos)

- [ ] **2.2** — `executor.ts`: Adicionar `executeMergeNode()` — nó passivo que apenas passa adiante o contexto do último step resolvido. A lógica de espera é tratada no BFS principal.

- [ ] **2.3** — `executor.ts` BFS principal: Implementar lógica de `wait-all` para `MergeNode`
  - Adicionar um mapa `mergeArrivalCount: Record<nodeId, number>` no contexto de execução local
  - Ao processar um Merge com `mode: "wait-all"`, só enfileira para execução quando `mergeArrivalCount[mergeNodeId] >= inDegree[mergeNodeId]`
  - Prevenir execução duplicada com `executed` Set já existente

- [ ] **2.4** — `workflows.routes.ts`: Adicionar `"merge"` ao `VALID_NODE_TYPES` e validação (`mode` deve ser `"wait-any" | "wait-all"`)

- [ ] **2.5** — Frontend: `MergeNode.vue` — visual com ícone `merge`, handles N entradas + 1 saída, CSS tokens `--nod8-node-merge-*`

- [ ] **2.6** — Frontend: `MergeEditor.vue` — seletor de `mode` (wait-any / wait-all) com descrição clara de cada opção

- [ ] **2.7** — Registrar em Canvas, AddNodePanel e editor registry

- [ ] **2.8** — ✅ **TESTE & COMMIT**: Criar workflow com Switch (2 branches) → ambos chegam no Merge → próximo nó executa uma única vez. Testar `wait-any` e `wait-all`. Commitar.

---

### FASE 3 — Nó Estrutural: Split In Batches
> **Pré-requisito**: Fase 2 concluída.
> **Critério de conclusão**: Arrays grandes são particionados em lotes, cada lote executa o sub-grafo, e o nó "done" libera ao terminar.

- [ ] **3.1** — `workflow-types.ts` (server + client): Adicionar `SplitInBatchesNode`
  - `{ type: "split-in-batches"; collection: string; batchSize: number; maxBatches?: number }`

- [ ] **3.2** — `executor.ts`: Implementar `executeSplitInBatchesNode()` baseado na estrutura do `executeLoopNode()` existente, mas com particionamento de array:
  - Fatiar o array em chunks de `batchSize`
  - Para cada chunk: injetar `context.variables.$batch`, `$batchIndex`, `$batchTotal`
  - Executar o sub-grafo de body (BFS interno idêntico ao do Loop)
  - Respeitar `maxBatches` como safety guard contra memory leak
  - Handle `batch-body` → executa para cada lote; `batch-done` → libera quando todos os lotes terminam

- [ ] **3.3** — `workflows.routes.ts`: Validar `collection` string e `batchSize` numérico > 0 ao salvar

- [ ] **3.4** — Frontend: `SplitInBatchesNode.vue` com handles `batch-body` e `batch-done`, ícone `layers`, CSS tokens `--nod8-node-split-*`

- [ ] **3.5** — Frontend: `SplitInBatchesEditor.vue` com campos `collection`, `batchSize`, `maxBatches`

- [ ] **3.6** — Registrar em Canvas, AddNodePanel e editor registry

- [ ] **3.7** — ✅ **TESTE & COMMIT**: Criar array de 10 itens, Split com batchSize=3 → verificar que `$batch` contém arrays de 3, 3, 3, 1. Commitar.

---

### FASE 4 — Plugins Nativos: Date & Time + Crypto + Compare Datasets
> **Pré-requisito**: Fase 1 concluída (pode ser paralela às fases 2-3).
> **Critério de conclusão**: Três plugins nativos registrados, visíveis no AddNodePanel, executando sem erro.

> ⚠️ **Regra**: Esses plugins vivem em `server/src/plugins/nod8/` e seguem **exatamente** o contrato do `_template`. O executor.ts não tem nenhum conhecimento especial deles.

- [ ] **4.1** — `server/src/plugins/nod8/date-time/manifest.json` + `methods.ts` + `index.ts`:
  - **Actions**: `format` (timestamp → string formatada), `parse` (string → timestamp), `add` (adicionar N unidades), `subtract`, `diff` (diferença entre datas), `now` (retorna data atual)
  - **Dependência**: `dayjs` — instalar no `server/package.json`
  - `index.ts`: `auth: { type: "none" }` — sem credenciais

- [ ] **4.2** — `server/src/plugins/nod8/crypto/manifest.json` + `methods.ts` + `index.ts`:
  - **Actions**: `hash` (SHA-256, MD5, SHA-512), `hmac` (HMAC-SHA256), `base64Encode`, `base64Decode`, `generateUUID`, `generateRandomString`
  - **Dependência**: módulo nativo `node:crypto` — sem instalação extra
  - `index.ts`: `auth: { type: "none" }`

- [ ] **4.3** — `server/src/plugins/nod8/compare-datasets/manifest.json` + `methods.ts` + `index.ts`:
  - **Actions**: `intersect` (comum nas duas listas), `difference` (exclusivo de A), `union` (todas únicas), `symmetricDifference` (exclusivo de cada uma)
  - **Parâmetros**: `listA: array`, `listB: array`, `matchKey: string` (campo usado para comparação)
  - Sem dependências externas — JavaScript puro
  - `index.ts`: `auth: { type: "none" }`

- [ ] **4.4** — ✅ **TESTE & COMMIT**: Usar cada plugin em um workflow simples. Verificar output no painel de saída do inspetor. Commitar.

---

### FASE 5 — Plugin Nativo: Wait / Sleep
> **Pré-requisito**: Fase 4 concluída.
> **Critério de conclusão**: Nó pausa execução por N segundos/milissegundos sem bloquear o Event Loop.

- [ ] **5.1** — `server/src/plugins/nod8/wait/manifest.json` + `methods.ts` + `index.ts`:
  - **Action única**: `sleep`
  - **Parâmetros**: `duration: number`, `unit: "milliseconds" | "seconds" | "minutes"`
  - **Implementação**: `await new Promise(resolve => setTimeout(resolve, durationMs))` dentro do método
  - **Limite de segurança**: máximo de 10 minutos (600.000ms) — acima disso retorna erro descritivo
  - Sem dependências externas
  - `index.ts`: `auth: { type: "none" }`

- [ ] **5.2** — ✅ **TESTE & COMMIT**: Workflow com sleep de 2s entre dois steps. Verificar no log de execução que o delay é real. Commitar.

---

### FASE 6 — Plugin Nativo: Read / Write File
> **Pré-requisito**: Fase 4 concluída.
> **Critério de conclusão**: Nó lê e escreve arquivos em diretório sandboxed. Path traversal retorna erro 400.

- [ ] **6.1** — Criar diretório seguro `server/workspace/` (gitignore'd) como root do sandbox

- [ ] **6.2** — `server/src/plugins/nod8/file/manifest.json` + `methods.ts` + `index.ts`:
  - **Actions**: `readText` (lê arquivo como string), `writeText` (escreve string), `readJson` (lê + parse JSON), `writeJson` (stringify + escreve), `deleteFile`, `listFiles` (lista arquivos no diretório do workflow)
  - **Segurança sandbox**: no início de cada método, usar `path.resolve(WORKSPACE_ROOT, workflowId, userFilename)` e verificar que o caminho resolvido começa com `WORKSPACE_ROOT` — se não, lançar `Error("Path traversal detected")`
  - `WORKSPACE_ROOT` definido via env var `ND8_WORKSPACE_PATH` com fallback para `./workspace`
  - `index.ts`: `auth: { type: "none" }`

- [ ] **6.3** — ✅ **TESTE & COMMIT**: Escrever um JSON em arquivo, ler de volta, tentar path `../../etc/passwd` e verificar que retorna erro. Commitar.

---

### FASE 7 — Nó Estrutural: Respond to Webhook
> **Pré-requisito**: Fase 1 concluída.
> **Critério de conclusão**: Workflow com trigger webhook retorna response customizada ao chamador original.

> ⚠️ **Decisão Arquitetural Crítica**: O HTTP Response Object do Fastify **nunca** entra no executor. Usamos o `PendingWebhookResponseRegistry` (singleton Map) como mediador desacoplado.

- [ ] **7.1** — Criar `server/src/core/modules/workflows/pending-webhook-registry.ts`:
  ```ts
  // Map<requestCorrelationId, { resolve: (response) => void; timer: NodeJS.Timeout }>
  // Timeout de 30s — se o workflow não responder, retorna 504 automaticamente
  ```

- [ ] **7.2** — `workflow-types.ts` (server + client): Adicionar `RespondToWebhookNode`
  - `{ type: "respond-webhook"; statusCode: number; body: string; headers?: Record<string, string> }`

- [ ] **7.3** — `executor.ts`: Implementar `executeRespondToWebhookNode()`:
  - Lê `context._webhookCorrelationId` (injetado pelo trigger)
  - Chama `PendingWebhookResponseRegistry.resolve(correlationId, { statusCode, body, headers })`
  - Retorna `{ statusCode, body }` como output do step para o log

- [ ] **7.4** — `workflows.routes.ts` webhook handler (modo produção):
  - Ao receber webhook: gerar `correlationId`, registrar no `PendingWebhookResponseRegistry`, injetar no `triggerPayload._webhookCorrelationId`
  - Aguardar `registry.waitForResponse(correlationId, timeoutMs: 30000)`
  - Se resolve antes do timeout → enviar response customizada
  - Se timeout → enviar `504 Gateway Timeout`

- [ ] **7.5** — Adicionar ao `VALID_NODE_TYPES` e validação de rota

- [ ] **7.6** — Frontend: `RespondToWebhookNode.vue` com ícone `send`, CSS tokens `--nod8-node-respond-webhook-*`

- [ ] **7.7** — Frontend: `RespondToWebhookEditor.vue` com campos `statusCode` (number), `body` (textarea com template support), `headers` (key-value pairs)

- [ ] **7.8** — Registrar em Canvas, AddNodePanel e editor registry

- [ ] **7.9** — ✅ **TESTE & COMMIT**: Webhook → algum nó → Respond to Webhook com `status: 201, body: { ok: true }`. Usar `curl` para verificar que a resposta recebida é exatamente essa. Commitar.

---

### FASE 8 — Form Trigger (Trigger Especial)
> **Pré-requisito**: Fase 7 concluída (herda o conceito de "resposta ao caller").
> **Critério de conclusão**: Nod8 hospeda uma página de formulário; submit dispara o workflow.

> ⚠️ **Nota**: Form Trigger é um `trigger.type = "form"` novo, não um nó adicional.

- [ ] **8.1** — `workflow-types.ts` (server + client): Adicionar `"form"` ao union de `WorkflowTrigger.type`; adicionar campo `formFields: Array<{ name: string; label: string; type: "text"|"email"|"number"|"textarea"; required?: boolean }>`

- [ ] **8.2** — `server/src/core/routes/workflows.routes.ts`: Registrar rota `GET /forms/:workflowId` que:
  - Busca o workflow pelo ID e verifica `trigger.type === "form"` e `metadata.isActive`
  - Gera e serve HTML estático minimalista com o formulário renderizado a partir de `formFields`
  - HTML deve ser auto-suficiente (inline CSS, sem dependências externas)

- [ ] **8.3** — Rota `POST /forms/:workflowId/submit`:
  - Valida campos obrigatórios
  - Constrói `triggerPayload` a partir dos dados do form
  - Dispara `WorkflowEngine.executeWorkflow()` assincronamente
  - Retorna página HTML de confirmação ("Formulário enviado com sucesso!")

- [ ] **8.4** — Frontend: Adicionar `"form"` ao `TriggerEditor.vue` — nova seção para configurar `formFields` com lista dinâmica de campos

- [ ] **8.5** — ✅ **TESTE & COMMIT**: Publicar workflow com Form Trigger. Acessar `/forms/:id`. Preencher e submeter. Verificar execution log no dashboard. Commitar.

---

## 📋 Status Global

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Set + Switch (Estruturais) | ⏳ Pendente |
| Fase 2 | Merge (Estrutural) | ⏳ Pendente |
| Fase 3 | Split In Batches (Estrutural) | ⏳ Pendente |
| Fase 4 | Date/Time + Crypto + Compare (Plugins) | ⏳ Pendente |
| Fase 5 | Wait / Sleep (Plugin) | ⏳ Pendente |
| Fase 6 | Read / Write File (Plugin) | ⏳ Pendente |
| Fase 7 | Respond to Webhook (Estrutural) | ⏳ Pendente |
| Fase 8 | Form Trigger | ⏳ Pendente |

---

## ⚠️ Checklist de Integridade Arquitetural (validar antes de cada commit)

- [ ] O `executor.ts` não contém strings mágicas de nomes de plugin (`"date-time"`, `"crypto"`, etc.)
- [ ] Plugins novos em `nod8/` não importam nada de `core/modules/`
- [ ] Tipos adicionados em `workflow-types.ts` no server foram sincronizados com o client
- [ ] `VALID_NODE_TYPES` no `workflows.routes.ts` foi atualizado para nós estruturais novos
- [ ] `validateWorkflowDefinition()` tem case de validação para cada novo nó estrutural
- [ ] `NODE_EDITOR_REGISTRY` tem o editor mapeado para cada novo tipo
- [ ] `AddNodePanel.vue` tem o nó na lista `LOGIC_NODES` (nós estruturais) ou não precisa (plugins aparecem via API)
- [ ] CSS tokens `--nod8-node-<type>-*` adicionados para cada novo nó visual
