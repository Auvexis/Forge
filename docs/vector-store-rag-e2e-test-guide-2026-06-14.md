# Guia de Teste E2E - Vector Store, RAG e Advanced Nodes

Base de comparacao: tudo que entrou depois do commit `5e10a30e`.

Objetivo: validar de ponta a ponta a feature de Vector Store, datasets, embedding models, retrievers, chains, tools e a nova base generica de Advanced Nodes.

## 1. O Que Entrou Depois do `5e10a30e`

### Vector Store / Retrieval

- Nodes de dataset:
  - `Text Dataset`
  - `Extract From File`
  - `Database Dataset`
- Node `Vector Store` com providers:
  - `Qdrant`
  - `Pinecone`
- Handles de configuracao no Vector Store:
  - `Embedding`
  - `Document`
- Modos de uso:
  - indexar documentos
  - consultar documentos
  - indexar e consultar no mesmo fluxo
- Edges de configuracao em estilo dashed.
- Quick Add contextual por handle.

### Embedding Models

- `OpenAI Embedding Model`
- `Ollama Embedding Model`
- Embeddings agora funcionam como configuracao/provider, nao como um node generico com provider e metodo.
- Icones de plugin/provider nos subnodes.

### BaseNode / BaseAdvancedNode

- Handlers configuraveis.
- `allowedNodes` / selectors por capability.
- `quickAdd`.
- `quickAddAfterConnected`.
- Handle style `diamond` / `circle`.
- Auto-organize para subnodes conectados.
- Visual de nodes avancados parecido com Tools Agent.

### Novos Advanced Nodes

- `Basic LLM Chain`
- `Structured JSON Parser`
- `Question and Answer Chain`
- `Vector Store Retriever`
- `Vector Store Tool`

### Agent + Tools

- `AI Agent` agora pode receber:
  - Chat Model
  - Memory
  - Tools
  - Vector Store Tool como tool
- `Vector Store Tool` recebe:
  - Vector Store
  - Chat Model
- O Vector Store usado pela tool recebe:
  - Embedding Model
  - Dataset opcional

## 2. Preparacao Recomendada

Use primeiro `Manual Trigger` para todos os testes. Depois que tudo funcionar com `Manual Trigger`, teste com `Chat Trigger` no Agent.

Ambiente recomendado:

- Client rodando.
- Server rodando.
- Pelo menos um Chat Model configurado:
  - OpenAI
  - OpenRouter
  - Ollama
- Pelo menos um Embedding Model:
  - OpenAI `text-embedding-3-small`, dimensao `1536`
  - ou Ollama `nomic-embed-text`, geralmente dimensao `768`
- Pelo menos um Vector Store:
  - Qdrant local/cloud
  - ou Pinecone

Configuracao sugerida para Qdrant local:

- URL: `http://localhost:6333`
- Collection: `fabric_e2e_kb`
- Metric: `cosine`
- Dimension: igual ao embedding model usado

Configuracao sugerida para OpenAI Embedding:

- Provider: `OpenAI`
- Model: `text-embedding-3-small`
- Dimension: `1536`
- Batch size: `32`

Configuracao sugerida para Ollama Embedding:

- Provider: `Ollama`
- Model: `nomic-embed-text`
- Dimension: `768`, se esse for o modelo local usado
- Batch size: `8`

## 3. Teste 1 - Add Node Panel / UX Global ✅

Objetivo: garantir que nodes contextuais nao aparecem onde nao devem.

Como testar:

1. Abra o workflow editor.
2. Clique para adicionar node globalmente, sem usar Quick Add de handle.
3. Entre na categoria `AI`.
4. Pesquise por:
   - `Embedding`
   - `AI Model`
   - `AI Tool`
   - `AI Memory`

Resultado esperado:

- Nodes contextuais/configuracao nao devem poluir o picker global.
- `Embeddings`, `AI Model`, `AI Tool` e `AI Memory` nao devem aparecer como nodes principais genericos.
- Nodes principais devem aparecer, como:
  - `AI Agent`
  - `Vector Store`
  - `Basic LLM Chain`
  - `Question and Answer Chain`

Depois:

1. Adicione um `Vector Store`. 
2. Clique no Quick Add do handle `Embedding`. 
3. Deve aparecer apenas Embedding Models compativeis. 
4. Clique no Quick Add do handle `Document`. 
5. Deve aparecer apenas Dataset nodes compativeis. 

## 4. Teste 2 - Text Dataset para Vector Store ✅

Objetivo: validar indexacao basica.

Workflow:

```text
Manual Trigger -> Qdrant Vector Store
Text Dataset -> Vector Store / Document
OpenAI Embedding Model -> Vector Store / Embedding
```

Payload do `Manual Trigger`:

```json
{
  "query": "What does Fabric do?"
}
```

Configuracao do `Text Dataset`:

- Format: `markdown` ou `txt`
- Chunking enabled: `true`
- Max chunk size: `800`
- Overlap: `100`

Texto exemplo:

```text
Fabric is a workflow automation platform with AI agents, tools, vector stores, datasets and plugin-based execution.

Fabric can connect agents to retrieval systems so they can answer questions using indexed documents.
```

Configuracao do `Vector Store`:

- Provider: `Qdrant` ou `Pinecone`
- Collection: `fabric_e2e_kb`
- Metric: `cosine`
- Dimension: igual ao embedding
- Retrieval mode: `index`

Resultado esperado:

- Execucao passa.
- Collection e criada se nao existir.
- Documentos/chunks sao enviados para o Vector Store.
- Edges para `Embedding` e `Document` aparecem dashed.
- `Text Dataset` e `Embedding Model` aparecem como subnodes/configuracao, nao como fluxo principal comum.

## 5. Teste 3 - Extract From File direto para Vector Store ✅

Objetivo: validar o novo input de multiplos arquivos.

Workflow:

```text
Manual Trigger -> Vector Store
Extract From File -> Vector Store / Document
Embedding Model -> Vector Store / Embedding
```

Configuracao:

- `Extract From File`: use 2 ou 3 arquivos:
  - `.md` ✅
  - `.json` ✅
  - `.csv` ✅
- Format: `auto` primeiro.
- Depois repita com `markdown`.
- Para `.json`:
  - JSON Mode: `Load Specific Data`.
  - JSON Path: `courses`.
  - Repetir com JSON que tenha `courses` e `instructors`; escolher explicitamente `courses`.
  - Marcar preservacao dos campos raiz como contexto/metadata.

Resultado esperado:

- Multiplos arquivos aparecem corretamente no editor.
- O node nao quebra visualmente.
- O Extract From File transforma dados extraidos em documentos.
- `Load Specific Data` gera um documento por item do array `courses`.
- JSON com multiplos arrays exige escolha explicita do `JSON Path`.
- Campos raiz fora do array sao preservados como metadata/contexto quando a opcao estiver ligada.
- O Vector Store recebe documentos/chunks vindos do Extract From File.
- Rodar duas vezes nao deve quebrar a collection.
- O Quick Add do handle `Document` deve continuar aparecendo se `quickAddAfterConnected` estiver ativo.

## 6. Teste 4 - Vector Store Query

Objetivo: validar busca sem Agent.

Workflow:

```text
Manual Trigger -> Vector Store -> Set/Output
Embedding Model -> Vector Store / Embedding
```

Payload do `Manual Trigger`:

```json
{
  "query": "What can Fabric agents use to answer with documents?"
}
```

Configuracao do `Vector Store`:

- Mesmo provider e collection dos testes anteriores.
- Retrieval mode: `query`.
- Query: `{{ trigger.query }}` se o editor permitir expressao.
- Top K: `3`
- Score threshold: `0`

Depois repita com:

- Top K: `5`
- Score threshold: `0.7`
- Filtro exato por metadata: `data.category = "moda"`.
- Filtro range por metadata: `data.score >= 600`.

Resultado esperado:

- Retorna documentos similares.
- Cada resultado deve ter texto/documento e, idealmente, score/metadata.
- Aumentar threshold deve reduzir resultados.
- Filtro exato deve retornar apenas documentos da categoria indicada.
- Filtro range deve retornar apenas documentos com score dentro do range.
- Se a collection estiver vazia, deve falhar de forma clara ou retornar lista vazia, sem crash.

## 7. Teste 5 - Basic LLM Chain

Objetivo: validar Advanced Node simples com Chat Model.

Workflow:

```text
Manual Trigger -> Basic LLM Chain -> Set/Output
Chat Model -> Basic LLM Chain / Model
```

Payload do `Manual Trigger`:

```json
{
  "text": "The customer was billed twice and wants a refund."
}
```

Configuracao do `Basic LLM Chain`:

Prompt:

```text
Classify this support message as billing, technical, or other.

Message:
{{ trigger.text }}
```

Input, se houver campo separado:

```text
{{ trigger.text }}
```

Chat Model:

- OpenAI: `gpt-4.1-mini`, ou o modelo configurado no projeto.
- Ollama: `llama3.1`, `llama3.2` ou outro instalado.

Resultado esperado:

- Execucao passa.
- O output contem resposta do modelo.
- O handle `Model` aceita apenas Chat Models no Quick Add.
- Nao deve aceitar Embedding Model, Dataset ou Vector Store nesse handle.

## 8. Teste 6 - Basic LLM Chain com Structured JSON Parser

Objetivo: validar parser opcional e Quick Add persistente.

Workflow:

```text
Manual Trigger -> Basic LLM Chain -> Set/Output
Chat Model -> Basic LLM Chain / Model
Structured JSON Parser -> Basic LLM Chain / Output Parser
```

Prompt:

```text
Return only valid JSON.

Classify this message:
{{ trigger.text }}

Return:
{
  "category": "billing | technical | other",
  "confidence": number
}
```

Schema do `Structured JSON Parser`:

```json
{
  "type": "object",
  "required": ["category", "confidence"],
  "properties": {
    "category": { "type": "string" },
    "confidence": { "type": "number" }
  }
}
```

Configuracao:

- Strict: `true`
- Failure policy: `error`, se existir

Resultado esperado:

- Output vira objeto estruturado.
- Se o modelo retornar texto invalido, o erro deve ser claro.
- O Quick Add do `Output Parser` deve continuar disponivel depois de conectado, se essa regra estiver configurada.

## 9. Teste 7 - Vector Store Retriever

Objetivo: validar retriever como dependency generica.

Workflow:

```text
Manual Trigger -> Vector Store Retriever -> Set/Output
Vector Store -> Vector Store Retriever / Vector Store
Embedding Model -> Vector Store / Embedding
```

Payload do `Manual Trigger`:

```json
{
  "query": "How does Fabric use vector stores?"
}
```

Configuracao do `Vector Store Retriever`:

- Query: `{{ trigger.query }}`
- Top K: `3`
- Score threshold: `0`
- Max context chars: `4000`, se existir

Configuracao do `Vector Store`:

- Collection ja indexada.
- Retrieval mode: `query`.

Resultado esperado:

- Retriever retorna contexto/documentos.
- O Retriever aceita apenas Vector Store no handle correto.
- O Vector Store continua exigindo Embedding Model.

## 10. Teste 8 - Question and Answer Chain

Objetivo: validar RAG completo sem Agent.

Workflow:

```text
Manual Trigger -> Question and Answer Chain -> Set/Output
Chat Model -> Q&A Chain / Model
Vector Store Retriever -> Q&A Chain / Retriever
Vector Store -> Vector Store Retriever / Vector Store
Embedding Model -> Vector Store / Embedding
```

Payload do `Manual Trigger`:

```json
{
  "question": "What does Fabric use vector stores for?"
}
```

Configuracao do `Question and Answer Chain`:

- Question: `{{ trigger.question }}`

System prompt:

```text
Answer only using the retrieved context. If the answer is not in the context, say you do not know.
```

Resultado esperado:

- A chain consulta o retriever.
- O retriever consulta o Vector Store.
- O Vector Store usa o Embedding Model.
- A resposta final vem do Chat Model usando contexto recuperado.
- Deve haver fontes/contexto no output, se a UI expuser isso.

## 11. Teste 9 - Vector Store Tool Dentro do AI Agent

Objetivo: validar o fluxo mais importante.

Workflow:

```text
Manual Trigger -> AI Agent -> Set/Output

Chat Model -> AI Agent / Chat Model
Vector Store Tool -> AI Agent / Tool

Vector Store -> Vector Store Tool / Vector Store
Chat Model -> Vector Store Tool / Model

Embedding Model -> Vector Store / Embedding
```

Opcional, para indexar junto:

```text
Text Dataset/Extract From File -> Vector Store / Document
```

Payload do `Manual Trigger`:

```json
{
  "message": "Search the knowledge base and explain what Fabric can do with vector stores."
}
```

Configuracao do `AI Agent`:

Prompt/System:

```text
You are a support agent. Use tools when you need facts from the knowledge base.
```

Outras configuracoes:

- Input/message: `{{ trigger.message }}`
- Max iterations: `5`
- Max tool calls: `5`
- Timeout: `180000`, se existir

Configuracao do `Vector Store Tool`:

- Tool name: `search_knowledge_base`
- Top K: `3`
- Score threshold: `0`

Description:

```text
Searches indexed knowledge base documents.
```

Instructions:

```text
Use the retrieved context to answer. Do not invent facts.
```

Resultado esperado:

- O Agent chama o Vector Store Tool.
- A tool consulta o Vector Store.
- O Agent responde usando o conteudo encontrado.
- O handle `Tool` do Agent deve permitir multiplas tools.
- O Quick Add do handle `Tool` deve continuar aparecendo depois de uma tool conectada.
- Edges de configuracao devem ser dashed.
- Edge principal do fluxo deve ser solid.

## 12. Teste 10 - Chat Trigger com Agent

Depois que o teste manual passar, teste com trigger real de chat.

Workflow:

```text
Chat Trigger -> AI Agent -> Response/Output
Chat Model -> AI Agent / Chat Model
Vector Store Tool -> AI Agent / Tool
Vector Store -> Vector Store Tool / Vector Store
Chat Model -> Vector Store Tool / Model
Embedding Model -> Vector Store / Embedding
```

Mensagem no chat:

```text
Use the knowledge base and tell me what Fabric vector stores are for.
```

Resultado esperado:

- O Agent responde no chat.
- Se precisar de conhecimento, chama a Vector Store Tool.
- A sessao nao deve perder contexto.
- O fluxo nao deve exigir Dataset conectado se a collection ja estiver indexada.

## 13. Teste 11 - Database Dataset

Objetivo: validar dataset vindo de plugin/banco.

Use esse teste apenas se houver plugin de banco configurado.

Workflow:

```text
Manual Trigger -> Vector Store
Database Dataset -> Vector Store / Document
Embedding Model -> Vector Store / Embedding
```

Configuracao sugerida:

- Plugin: PostgreSQL, Supabase ou outro provider disponivel.
- Metodo: query/list rows.
- Query exemplo:

```sql
select id, title, body from docs limit 10;
```

- Text field: `body`
- Metadata fields:
  - `id`
  - `title`

Resultado esperado:

- Linhas do banco viram documentos diretamente pelo Database Dataset.
- Campo de texto correto e usado para embedding.
- Metadata e preservada.
- Vector Store indexa os documentos.

## 14. Testes Negativos

### Vector Store sem Embedding Model

Resultado esperado:

- Execucao deve bloquear com erro claro.

### Extract From File direto no Vector Store sem Embedding

Workflow invalido:

```text
Extract From File -> Vector Store / Document
```

Resultado esperado:

- UI deve impedir ou backend deve rejeitar porque `Embedding` e obrigatorio para indexacao.

### Extract From File com JSON Path invalido

Configuracao invalida:

- JSON Mode: `Load Specific Data`
- JSON Path: `lessons`
- Arquivo JSON contem apenas `courses` e `instructors`.

Resultado esperado:

- Erro claro dizendo que o JSON path nao foi encontrado.

### Extract From File com JSON Path vazio

Configuracao invalida:

- JSON Mode: `Load Specific Data`
- JSON Path vazio.

Resultado esperado:

- Erro claro dizendo que JSON Path e obrigatorio quando o modo especifico esta ligado.

### Metadata filter invalido

Configuracao invalida:

- Filter: `{ "data.score": { "$between": [600, 900] } }`

Resultado esperado:

- Erro claro de operador de filtro nao suportado.

### Question and Answer Chain sem Retriever

Resultado esperado:

- Erro claro dizendo que falta retriever/dependency.

### Basic LLM Chain sem Chat Model

Resultado esperado:

- Erro claro dizendo que falta model.

### Dataset conectado no handle de Chat Model

Resultado esperado:

- UI deve impedir ou backend deve rejeitar.

### Embedding Model conectado no handle de Tool

Resultado esperado:

- UI deve filtrar e impedir.

### Dimension mismatch

Exemplo:

- Collection com dimensao `1536`.
- Embedding Ollama com dimensao `768`.

Resultado esperado:

- Erro do provider/vector store, mas sem crash silencioso.

## 15. Teste Visual Obrigatorio

### AI Agent

Validar:

- Handles embaixo.
- Subnodes organizados abaixo.
- Chat Model, Memory e Tool com handle no topo em formato correto.
- Tool Quick Add continua depois de conectado.

### Vector Store

Validar:

- Visual parecido com Tools Agent.
- Icone do provider/plugin aparece.
- Handles `Embedding` e `Document` embaixo.
- Subnodes redondos/circulares quando aplicavel.
- Quick Add de `Document` continua depois de conectar um dataset.

### Vector Store Tool

Validar:

- Recebe `Vector Store`.
- Recebe `Model`.
- Pode ser conectado ao `AI Agent` como `Tool`.

### Basic LLM Chain

Validar:

- Recebe `Model`.
- Recebe `Output Parser` opcional.
- Quick Add do parser nao some depois de conectado.

### Edges

Validar:

- Fluxo principal: solid.
- Config/dependency: dashed.
- Nada deve sobrepor label, handle, quick add ou node.

## 16. Checklist de Quick Add

### AI Agent

- `Chat Model` deve mostrar apenas Chat Models.
- `Memory` deve mostrar apenas Memory nodes.
- `Tool` deve mostrar AI tools, incluindo `Vector Store Tool`.
- `Tool` deve continuar com Quick Add depois de uma tool conectada.

### Vector Store

- `Embedding` deve mostrar apenas Embedding Models.
- `Document` deve mostrar:
  - `Extract From File`
  - `Text Dataset`
  - `Database Dataset`
- `Document` deve continuar com Quick Add depois de uma fonte conectada.

### Basic LLM Chain

- `Model` deve mostrar apenas Chat Models.
- `Output Parser` deve mostrar `Structured JSON Parser`.
- `Output Parser` deve continuar com Quick Add depois de conectado.

### Question and Answer Chain

- `Model` deve mostrar apenas Chat Models.
- `Retriever` deve mostrar `Vector Store Retriever`.

### Vector Store Tool

- `Vector Store` deve mostrar apenas Vector Stores.
- `Model` deve mostrar apenas Chat Models.

## 17. Checklist de Aceite Final

- Config nodes escondidos do picker global.
- Picker contextual filtra por `allowedNodes` / capabilities.
- Icones de provider aparecem.
- Handles e labels ficam nas posicoes corretas.
- Edges dashed para configuracao.
- Edges solid para fluxo principal.
- Sem overlap em canvas grande.
- Sem overlap em viewport menor.
- Required handles bloqueiam execucao quando faltam dependencias.
- Chat Model aceita apenas um e substitui corretamente.
- Agent Tool aceita multiplos.
- Vector Store Document aceita multiplos documentos via `Extract From File`, `Text Dataset` e `Database Dataset`.
- Vector Store query retorna docs/scores.
- Question and Answer Chain retorna answer/context/sources.
- Vector Store Tool funciona dentro do Agent.
- Basic LLM Chain com parser retorna objeto estruturado.

## 18. Ordem Recomendada de Teste

1. Picker/Quick Add visual.
2. Text Dataset + Embedding + Vector Store index.
3. Vector Store query.
4. Extract From File multi-file direto no Vector Store.
5. Basic LLM Chain.
6. Basic LLM Chain + JSON Parser.
7. Vector Store Retriever.
8. Question and Answer Chain.
9. AI Agent + Vector Store Tool.
10. Chat Trigger com Agent.
11. Testes negativos.

Essa ordem evita dor: primeiro valida storage e embeddings, depois retrieval, depois chains, e so no fim Agent com tool, que e onde mais coisa se combina.
