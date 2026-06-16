# N8N-like Document Loader Architecture Plan

- [x] Auditar guia E2E de Vector Store/RAG
- [x] Comparar fluxo atual com n8n Extract From File + Default Data Loader
- [x] Fase 1: separar File Dataset de Document Loader
- [x] Fase 2: criar node Document Loader
- [x] Fase 3: migrar Vector Store para aceitar Document Loader
- [x] Fase 4: alinhar JSON/CSV/TXT/Markdown ao comportamento n8n
- [x] Fase 5: revisar UX dos Advanced Nodes do guia E2E
- [x] Fase 6: revisar filtros/metadata para Qdrant e Pinecone
- [ ] Fase 7: atualizar testes E2E e negativos
- [ ] Fase 8: migração compatível dos workflows existentes

## Objetivo

Deixar File Dataset, Document Loader e Vector Store com usabilidade e estabilidade próximas ao n8n:

```text
File Dataset / Extract -> Document Loader -> Vector Store
```

## Decisão Arquitetural

- `File Dataset` extrai arquivos e retorna dados estruturados.
- `Document Loader` transforma dados em documentos indexáveis.
- `Vector Store` indexa/consulta documentos prontos.
- Nada deve tentar adivinhar arrays JSON automaticamente sem configuração explícita.

## Fase 1: Separar File Dataset de Document Loader

- [x] Criar contrato `FileExtractOutput`.
- [ ] `File Dataset` deixa de expor capability `document-source`.
- [ ] `File Dataset` passa a expor capability `file-data-source`.
- [x] CSV retorna rows estruturadas.
- [x] JSON retorna objeto/array estruturado.
- [x] TXT/Markdown retornam texto bruto.
- [x] Preservar `source.filename`, `mimeType`, `size`.
- [ ] Manter compatibilidade temporária com workflows antigos.
- [x] Testar `.csv`, `.json`, `.txt`, `.md`.
- [x] Commit: `refactor: separate file dataset extraction`

## Fase 2: Criar Document Loader

- [x] Criar node `document-loader`.
- [x] Adicionar type em `workflow-types.ts`.
- [x] Adicionar manifest no `sailor-core`.
- [x] Adicionar handler backend.
- [x] Adicionar editor Vue.
- [x] Adicionar node visual.
- [x] Capability: `document-source`.
- [ ] Handles:
  - input `Data`
  - output config source
- [ ] Modos iguais ao n8n:
  - `Load All Input Data`
  - `Load Specific Data`
- [ ] Type of Data:
  - `JSON`
  - `Binary/File`
  - `Text`
- [ ] Campos principais:
  - `dataMode`
  - `dataPath`
  - `textTemplate`
  - `metadataTemplate`
  - `includeSourceMetadata`
- [ ] Testar criação global escondendo configurações contextuais quando necessário.
- [x] Commit: `feat: add document loader node`

## Fase 3: Migrar Vector Store

- [x] Vector Store `Document` aceita `document-loader`.
- [x] Vector Store deixa de depender direto de `file-dataset` como documento final.
- [x] Quick Add do handle `Document` mostra `Document Loader` primeiro.
- [x] Permitir `Text Dataset` temporariamente por compatibilidade.
- [x] Erro claro quando Vector Store recebe File Dataset direto sem loader.
- [x] Atualizar `ConfigDependencyResolver`.
- [x] Atualizar `core-capability-adapters`.
- [x] Testar indexação com Qdrant.
- [ ] Testar indexação com Pinecone.
- [x] Commit: `refactor: route vector documents through loader`

## Fase 4: JSON/CSV/TXT/Markdown igual ao n8n

- [x] CSV: uma row por item extraído.
- [x] CSV: metadata com tipos corretos para filtros.
- [x] JSON: `whole file` mantém objeto inteiro.
- [x] JSON: `Load Specific Data` usa `dataPath`.
- [x] JSON: se `dataPath` aponta array, gera um documento por item.
- [x] JSON: campos raiz fora do array viram metadata/contexto opcional.
- [x] JSON: múltiplos arrays exigem escolha explícita.
- [x] TXT: um documento por arquivo.
- [x] Markdown: um documento por arquivo.
- [x] Markdown: respeitar chunking no loader, não no extractor.
- [x] Testar JSON com `courses`.
- [x] Testar JSON com múltiplos arrays.
- [x] Commit: `feat: align document loading formats with n8n`

## Fase 5: UX dos Advanced Nodes

- [x] `File Dataset` deve parecer node de extração de dados.
- [x] `Document Loader` deve parecer subnode/configuração do Vector Store.
- [x] Quick Add `Vector Store / Document` cria `Document Loader`.
- [x] Quick Add do `Document Loader / Data` mostra File Dataset, Text Dataset e Database Dataset.
- [x] Evitar nodes de configuração no picker global.
- [x] Revisar labels:
  - [x] `File Dataset` -> `Extract From File` ou manter nome Sailor com subtítulo claro.
  - [x] `Document Loader` -> `Default Data Loader`.
- [x] Garantir que múltiplos arquivos não travem editor.
- [x] Garantir preview lazy para outputs grandes.
- [x] Commit: `feat: improve document loader ux`

## Fase 6: Metadata e Filtros

- [x] Padronizar metadata:
  - `source`
  - `data`
  - `context`
  - `embeddings`
- [x] Qdrant mantém metadata aninhada.
- [x] Pinecone achata metadata ao gravar.
- [x] Pinecone reconstrói metadata ao ler.
- [x] Adicionar helper para converter filtro Sailor para Qdrant.
- [x] Adicionar helper para converter filtro Sailor para Pinecone.
- [x] Testar `data.category = "moda"`.
- [x] Testar `data.score >= 600`.
- [x] Commit: `feat: normalize vector metadata filters`

## Fase 7: Testes E2E do Guia

- [ ] Atualizar Teste 3 para `File Dataset -> Document Loader -> Vector Store`.
- [ ] Atualizar JSON esperado para `Load Specific Data`.
- [ ] Adicionar teste com múltiplos arrays JSON.
- [ ] Adicionar teste com campos raiz preservados.
- [ ] Adicionar teste de filtro exato por metadata.
- [ ] Adicionar teste de range por metadata.
- [ ] Revisar Testes 7-11 para usar Document Loader quando houver documentos.
- [ ] Adicionar testes negativos:
  - File Dataset direto no Vector Store
  - JSON path inválido
  - JSON path não-array em modo array
  - metadata inválida
- [ ] Commit: `test: update vector rag e2e for document loader`

## Fase 8: Migração

- [ ] Detectar workflows antigos com Dataset direto no Vector Store.
- [ ] Criar migração automática inserindo Document Loader entre eles.
- [ ] Preservar posição visual do canvas.
- [ ] Preservar edges dashed.
- [ ] Preservar configurações de chunking.
- [ ] Adicionar versão de workflow/migration note.
- [ ] Commit: `feat: migrate vector document sources`

## Arquivos Prováveis

- `server/src/shared/models/workflow-types.ts`
- `client-vue/src/core/types/workflow.types.ts`
- `server/src/core/utility-nodes/sailor-core/manifest.ts`
- `server/src/core/utility-nodes/sailor-core/index.ts`
- `server/src/core/nodes/handlers/retrieval.ts`
- `server/src/core/nodes/dependencies/core-capability-adapters.ts`
- `server/src/core/modules/workflows/workflow-validation.ts`
- `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- `client-vue/src/features/workflow-editor/components/nodes/DocumentLoaderNode.vue`
- `client-vue/src/features/workflow-editor/components/settings/editors/DocumentLoaderEditor.vue`
- `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- `client-vue/src/features/workflow-editor/layout/advancedNodeDefinitions.ts`
- `docs/vector-store-rag-e2e-test-guide-2026-06-14.md`

## Riscos

- Migração quebrar workflows existentes.
- JSON auto demais voltar a criar bugs.
- Pinecone limitar metadata aninhada.
- UI ficar complexa se todos os modos aparecerem de uma vez.

## Ordem Recomendada

1. Contratos backend.
2. Handler Document Loader.
3. Adapter Vector Store.
4. UI mínima.
5. Quick Add.
6. Migração.
7. E2E completo.


