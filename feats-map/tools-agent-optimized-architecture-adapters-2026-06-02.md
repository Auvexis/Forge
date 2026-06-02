# Tools Agent Optimized Architecture + Adapters - 2026-06-02

## Problema

O Tools Agent ainda deixa a LLM carregar responsabilidade demais:

- A LLM ve schemas completos demais cedo demais.
- A LLM gera tool call, parametros e progresso no mesmo fluxo.
- Resultados de tools entram no contexto, mesmo compactados.
- Retry atual repete a mesma chamada em alguns casos, sem deixar a LLM corrigir parametros.
- Ollama usa adapter `generic` via OpenAI-compatible, mas nao existe metodo interno claro para JSON estruturado.
- `google_drive_download_file` falha em Google Docs Editors files porque Drive exige export, nao download binario.
- Com mais de 10 tools conectadas, o Ollama recebe tool schemas/contexto demais e a GPU trava antes da primeira resposta.
- Cada step do Tools Agent pode disparar nova inferencia do modelo; o Workflow Editor executa nodes direto, sem LLM entre steps.

Erro atual:

```text
Only files with binary content can be downloaded. Use Export with Docs Editors files.
```

## Diagnostico

Existem dois problemas separados.

### Diagnostico De Performance

O travamento do computador vem do loop do agente, nao das tools em si:

- Workflow manual: Drive search -> Drive download -> Gmail send roda por executor deterministico.
- Tools Agent: modelo decide tool, gera parametros, recebe resultado, decide proxima tool, gera parametros de novo.
- Com muitas tools, o runtime ainda passa definicoes/schema de tools para o modelo.
- Ollama local precisa processar esse contexto em GPU/CPU antes de qualquer mensagem aparecer.
- Quando cada step chama o modelo novamente, a GPU sobe para 100%.
- Resultados compactados ajudam, mas nao resolvem se o gargalo principal for schema/tool calling + reinferencia.

Conclusao:

- O Tools Agent esta usando a LLM como orquestrador e roteador de dados.
- O Workflow Editor usa o backend como orquestrador e so executa plugins.
- A arquitetura nova precisa deixar o backend orquestrar e deixar a LLM apenas escolher plano/parametros pequenos.

### Diagnostico Do Drive

O erro de Drive nao e bug de schema da LLM apenas. E bug de operacao:

- Arquivos binarios do Drive usam `files.get({ alt: "media" })`.
- Google Docs, Sheets e Slides usam `files.export`.
- A tool `google_drive_download_file` busca metadata, mas sempre chama download binario.
- Solucao correta: a tool deve detectar `application/vnd.google-apps.*` e exportar para MIME binario configurado/padrao.

## Decisao Recomendada

Criar uma arquitetura em 3 fases leves:

1. **Planner leve**
   - Modelo ve catalogo compacto: `name`, `description`, `instructions`, `sideEffect`, `pluginName`.
   - Sem schema completo de todas as tools.
   - Retorna JSON com proxima acao: `tool_name`, `reason`, `needs_schema`.
   - Deve rodar com prompt pequeno e sem bindTools pesado.

2. **Parameterizer sob demanda**
   - Backend injeta apenas o schema da tool escolhida.
   - Modelo retorna apenas JSON de parametros.
   - Backend valida com AJV antes de executar.
   - Se falhar validacao, retry passa erro + schema da tool.

3. **Executor deterministico**
   - Backend executa tool.
   - Backend emite steps fixos em EN-US.
   - LLM nao escreve mais "I will use", "using", "success".
   - LLM escreve apenas mensagem inicial e final.
   - Tool result fica em ref/contexto backend; modelo ve so resumo minimo.

## Arquitetura Proposta

### 1. Tool Catalog Compact

Criar `AgentToolCatalogService`.

Entrada:

- `SailorAgentToolDefinition[]`
- defaults configurados no node

Saida para modelo:

```json
[
  {
    "name": "google_drive_download_file",
    "pluginName": "Google Drive",
    "description": "Download or export a file from Google Drive.",
    "instructions": "Use after selecting a specific fileId. For Google Docs Editors files, this tool exports to a binary format.",
    "sideEffect": "read"
  }
]
```

Nao incluir:

- `inputSchema` completo
- `responseSchema` completo
- defaults sensiveis
- credenciais
- payload de resultado

### 2. Important Memory Per Chat

Salvar o catalogo compacto como item `important` do chat/sessao.

Regra:

- `important.tools.catalog`: catalogo compacto.
- `important.tools.schemas[toolName]`: schema carregado sob demanda.
- Nao salvar binario/base64.
- Nao salvar resultado grande.

Se ainda nao existir store de important explicito, usar mensagem system/context compacta por enquanto e depois migrar para tabela propria.

### 3. Tool Schema On Demand

Quando planner escolher uma tool:

- Backend localiza `SailorAgentToolDefinition`.
- Backend carrega `inputSchema`.
- Backend remove campos ja resolvidos por defaults.
- Backend injeta schema somente no parameterizer.

Schema fica disponivel apenas para aquela tool call.

### 4. Model Adapter Interface

Criar interface comum:

```ts
interface AgentModelAdapter {
  invokeText(input): Promise<string>;
  invokeJson<T>(input, schema?: JsonSchema): Promise<T>;
  invokeToolPlan(input): Promise<AgentToolPlan>;
}
```

Providers:

- `openai`: provider proprio para OpenAI, usando Responses/Chat Completions com structured output quando disponivel.
- `openrouter`: provider proprio para OpenRouter, usando API OpenAI-compatible, mas com regras/propriedades especificas do OpenRouter.
- `ollama`: provider proprio para Ollama, usando `/api/chat` com `format: "json"` ou schema quando suportado.

Nao usar mais `generic` como adapter principal do Agent Runtime.

Pasta proposta:

```text
server/src/core/modules/agent-runtime/model-adapters/
  agent-model-adapter.ts
  openai-adapter.ts
  openrouter-adapter.ts
  ollama-adapter.ts
  adapter-registry.ts
```

Cada adapter deve encapsular:

- auth/credential shape
- base URL default
- chamada texto
- chamada JSON
- tool/planner JSON
- normalizacao de erro
- suporte a thinking/reasoning
- limites/quirks do provider

Meta:

- O runtime nao deve depender de LangChain para JSON critico.
- LangChain pode ficar para chat streaming/texto.
- JSON de parametros deve passar por endpoint/adaptador deterministico.
- Novos providers entram adicionando arquivo novo em `model-adapters/`, sem alterar o loop do Agent.

### 5. Planner Output

O planner deve retornar apenas:

```json
{
  "action": "call_tool",
  "toolName": "google_drive_download_file",
  "reason": "The user needs the selected Drive file content."
}
```

Ou:

```json
{
  "action": "ask_user",
  "question": "Which file should I use?",
  "options": []
}
```

Ou:

```json
{
  "action": "final",
  "message": "Done."
}
```

### 6. Parameterizer Output

O parameterizer recebe:

- user message
- compact context
- selected tool name
- selected tool instructions
- selected tool schema
- compact previous results/refs

Retorna:

```json
{
  "fileId": "abc123"
}
```

Backend valida. Se invalido, retry com erro de validacao.

### 7. Retry Policy

Configurar no Tools Agent:

- `maxToolRetries`: default 1 ou 2.
- `retryOn`: `schema_validation`, `tool_query_error`, `transient_error`.
- Nunca retry em erro interno, credencial, permissao, approval, payload limit.

Classificacao:

- `internal_error`: cancela.
- `credential_error`: waiting-user.
- `permission_error`: waiting-user.
- `schema_error`: retry parameterizer.
- `query_error`: retry parameterizer com erro da tool.
- `transient_error`: retry executor ou parameterizer, conforme caso.
- `provider_semantic_error`: retry se houver alternativa clara, senao waiting-user.

### 8. Deterministic Progress Steps

LLM nao gera mais step text.

Backend gera sempre EN-US:

- planned: `Preparing to use {toolLabel}.`
- running: `Using {toolLabel}.`
- retrying: `Retrying {toolLabel}.`
- success: `{toolLabel} completed.`
- failed: `{toolLabel} failed.`
- waiting-user: `Waiting for user input.`

Mensagem inicial/final ainda pode ser da LLM.

### 9. Google Drive Export Bugfix

Atualizar `google_drive_download_file`:

- Metadata deve ler `name, mimeType`.
- Se `mimeType` comeca com `application/vnd.google-apps.`, usar `files.export`.
- Adicionar parametro opcional `exportMimeType`.
- Defaults:
  - docs document -> `application/pdf`
  - spreadsheet -> `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - presentation -> `application/pdf`
  - drawing -> `image/png`
- Nome do arquivo deve ganhar extensao coerente.
- Agent description deve dizer "download or export".

## Tasks

### 0. Analise

- [x] Ler `DEFAULT_PROMPT.md`.
- [x] Ler feats de Tools Agent e Global Agent Chat em `feats-map/`.
- [x] Mapear runtime atual: `agent-graph-builder`, `agent-runner`, `plugin-tool-adapter`, `plugin-tool-executor`.
- [x] Mapear adapters atuais: `model-provider-registry`, `openai-compatible-provider`, plugins Ollama/OpenAI/OpenRouter.
- [x] Confirmar causa do erro Drive Docs Editors.

### 1. Bugfix Drive Export

- [ ] Criar teste falhando para `google_drive_download_file` com `application/vnd.google-apps.document`.
- [ ] Implementar export por MIME type quando arquivo for Docs Editors.
- [ ] Adicionar `exportMimeType` opcional no manifest.
- [ ] Atualizar description/instructions da agent tool.
- [ ] Rodar testes do plugin Google Drive.

### 2. Tool Catalog Compact

- [ ] Criar `AgentToolCatalogService`.
- [ ] Gerar catalogo sem schemas completos.
- [ ] Incluir `instructions` em `agentTool` metadata.
- [ ] Criar testes para garantir que catalogo nao inclui payload pesado/default sensivel.
- [ ] Integrar no Agent Runner/Graph sem quebrar tools atuais.

### 3. Schema Sob Demanda

- [ ] Criar resolver de schema por `toolName`.
- [ ] Remover defaults configurados do schema visivel ao modelo.
- [ ] Validar parametros com AJV antes do executor.
- [ ] Criar retry para erro de schema sem executar tool.

### 4. Adapter JSON Estruturado

- [ ] Criar pasta `server/src/core/modules/agent-runtime/model-adapters/`.
- [ ] Criar contrato `AgentModelAdapter` com `invokeText`, `invokeJson` e `invokeToolPlan`.
- [ ] Implementar `ollama-adapter.ts` usando `/api/chat` e `format: "json"`.
- [ ] Implementar `openrouter-adapter.ts` separado do OpenAI, mesmo usando API OpenAI-compatible.
- [ ] Implementar `openai-adapter.ts` separado para OpenAI.
- [ ] Remover dependencia de `generic` como adapter principal no Tools Agent.
- [ ] Criar fallback parser estrito para providers sem schema nativo.
- [ ] Testar `invokeJson` retornando objeto valido e rejeitando texto/prosa.

### 5. Planner + Parameterizer

- [ ] Separar loop atual em planner e parameterizer.
- [ ] Planner escolhe tool/ask/final usando catalogo compacto.
- [ ] Parameterizer recebe apenas schema da tool escolhida.
- [ ] Executor recebe apenas JSON validado pelo backend.
- [ ] Preservar binary refs entre tool calls.

### 6. Retry Inteligente

- [ ] Criar classificador de erro central.
- [ ] Separar erro interno de erro corrigivel pela LLM.
- [ ] Retry com schema + erro + contexto compacto.
- [ ] Parar em credencial/permissao/approval/payload limit.
- [ ] Emitir evento `agent:tool-retry` com reason deterministico EN-US.

### 7. Steps EN-US Deterministicos

- [ ] Remover texto dinamico da LLM para steps intermediarios.
- [ ] Centralizar formatter EN-US.
- [ ] Garantir Global Agent Chat renderiza planned/running/retrying/success/failed.
- [ ] LLM gera apenas intro/final.

### 8. Verificacao

- [ ] Rodar testes focados do `agent-runtime`.
- [ ] Rodar testes focados de `agent-panel.routes`.
- [ ] Rodar testes do plugin Google Drive.
- [ ] Rodar build do `server`.
- [ ] Rodar build do `client-vue` se alterar contrato visual.
- [ ] Atualizar este plano conforme cada task for concluida.
- [ ] Commitar por bloco coerente, sem `git add .`.

## Riscos

- Trocar tool-calling LangChain de uma vez pode quebrar OpenAI/OpenRouter.
- Planner/parameterizer aumenta numero de chamadas ao modelo.
- Ollama JSON mode nao garante schema perfeito em todos os modelos; AJV e retry continuam obrigatorios.
- Salvar schemas em important pode inflar memoria se salvar todas as tools; melhor salvar catalogo todo e schema apenas sob demanda.
- Export de Google Sheets para XLSX pode gerar arquivo grande; manter binary ref pipeline.

## MVP

1. Corrigir Google Drive export.
2. Parar de mandar schemas de todas as tools para Ollama.
3. Criar pasta `model-adapters/` com adapters separados para Ollama, OpenRouter e OpenAI.
4. Criar planner compacto sem `bindTools`.
5. Criar parameterizer JSON para uma tool por vez.
6. Executar chain pelo backend com refs e steps deterministico.

## Minha Correcao Na Proposta

A proposta esta certa no rumo, mas eu mudaria:

- Nao salvar schema de todas as tools como important.
- Salvar catalogo compacto sempre.
- Salvar schema apenas da tool usada ou em cache curto.
- Nao depender da LLM para decidir se erro e interno; backend classifica primeiro.
- Corrigir Drive export no plugin mesmo assim, porque arquitetura nova nao deve mascarar tool semanticamente errada.
