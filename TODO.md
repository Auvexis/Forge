---  
1️⃣ Visão geral do módulo existente  
Camada	Artefato	Responsabilidade
API	server/src/core/routes/workflows.routes.ts	CRUD + execução de workflows.
Modelo	server/src/shared/models/workflow-types.ts	Definições de trigger, node, edge, metadata.
Engine	server/src/modules/workflows/executor.ts (não listado, presumido)	Interpreta o grafo (DAG) e executa os nós.
Persistência	WorkflowRepository (presumido)	Armazena workflows e históricos de execução.
O backend já oferece um graph‑based DAG simples, mas a modelagem dos nós é limitada a:
* pluginId, action, params – execuções de plugins únicos.  
* Sem no‑de tipo “condicional”, “loop”, “bloco de código”, nem suporte a sub‑workflows.  
O cliente (editor visual) ainda não está exposto neste repositório, mas a falta de tipos impede que o front‑end ofereça componentes avançados.  
---

2️⃣ Gaps em relação ao editor do n8n  
Feature requeridas Presente? Comentário
Blocos de código (script) Não Falta modelo para armazenar script ou referência a runner.
If / Else (condicionais) Não (apenas condition? nas edges) Necessita de nó gateway que pode ter duas ramificações.
Loop / ForEach Não Falta nó que itere sobre coleções e reaplique sub‑grafo.
Sub‑workflow / Reuso de nós Não Nenhum conceito de “workflow nesting”.
Variáveis de escopo / Mapas de dados Parcial (params com templating {{ }}) Não há capacidade de definir/ler variáveis entre nós.
Manipulação de erros avançada Apenas RetryPolicy no nó Não há “catch” ou “finally” como no n8n.
UI metadata Apenas positionX/Y Não há size, collapsed, typeIcon, etc., que auxiliam o editor.
Validação de schema Apenas trigger.schema? Falta validação de entrada/saída de cada nó.
Versionamento / Draft metadata.version (string) Não há mecanismos de draft ou branch de workflow.

---

## 3️⃣ Estratégia de evolução (staff‑engineer)

1. **Extensão do modelo de dados** _(breaking change – version bump)_
   - Criar enum `WorkflowNodeType` (`plugin`, `code`, `if`, `loop`, `subworkflow`, `trigger`)
   - Refatorar `WorkflowNode` para ser discriminated union, permitindo propriedades específicas por tipo.
   - Introduzir `WorkflowVariable` e `WorkflowScope` para mapear variáveis globais/locais.
   - Expandir `WorkflowEdge` para suportar `sourceHandle`/`targetHandle` (ex.: “else” vs “then”).
2. **Engine de execução**
   - Implementar **interpretação baseada em tipos**: switch por `node.type`.
   - **If/Else** → Avaliar `condition` e escolher edge “true” ou “false”.
   - **Loop** → Avaliar coleção e replicar sub‑grafo para cada item (usar stack de contexto).
   - **Code** → Executar script em sandbox (ex.: `vm2` ou `isolated-vm`) e expor `variables`.
   - **Sub‑workflow** → Chamar recursivamente `executeWorkflow` com novo payload.
3. **Persistência e versionamento**
   - Mudar `metadata.version` para semver e criar tabela `workflow_drafts` com `isActive`/`isDraft`.
   - Ao salvar, validar schema (usando `ajv`) e impedir “breaking changes” em versões ativas.
4. **API de suporte ao editor**
   - Novo endpoint `GET /workflows/:id/schema` que devolve **JSON Schema** completa do workflow (nós, edges, variáveis).
   - Endpoint `GET /plugins` (já existe? Caso não, criar) para que o front‑end carregue definições de blocos (nome, parâmetros, ícone).
5. **Frontend (não codificado aqui)**
   - O editor pode usar a nova estrutura para gerar **componentes de node** dinamicamente (code, if, loop).
   - UI metadata enriquecida (`type`, `icon`, `collapsed`, `size`).

---

4️⃣ Plano de migração (curto‑prazo)
Sprint Atividade Artefato Resultado esperado
1 Load staff-engineer skill → mapear requisitos detalhados. — Base de decisões alinhada.
2 Atualizar workflow-types.ts com WorkflowNodeType e discriminated unions. server/src/shared/models/workflow-types.ts Compilação do backend ainda falha até ajustes na engine.
3 Refatorar WorkflowEngine.executeWorkflow para reconhecer novos tipos (if, loop, code). server/src/modules/workflows/executor.ts (criar se ausente) Execução básica de novos nós funciona em testes unitários.
4 Implementar sandbox para blocos de código (vm2). server/src/modules/workflows/code-runner.ts Scripts seguros executados com acesso a variáveis.
5 Criar endpoints de schema e plugins. workflows.routes.ts (novos GET) Front‑end obtém definição completa.
6 Atualizar repositório para versionamento/drafts. WorkflowRepository + migrations. Fluxo de publicação de workflows sem perda de versões.
7 Testes integrados + documentação OpenAPI. tests/ (novo) Cobertura mínima 80 % das novas rotas/engine.

---

5️⃣ Trade‑offs e Considerações
Decisão Benefício Custo / Risco
Usar vm2 para scripts Segurança, isolamento de dependências. Overhead de criação de sandbox; limitações de API Node (não pode acessar FS).
Discriminated union nos nós Tipagem forte, IDE autocomplete, validação estática. Quebra de compatibilidade; precisarão migrar workflows existentes (script de migração).
Persistir schema JSON Permite validação automática no cliente e no servidor. Aumenta tamanho do registro; necessidade de migração de bancos.
Adicionar versionamento Controle de rollout, rollback fácil. Complexidade nas queries (buscar por versão ativa).
Suporte a loops Poder expressivo próximo ao n8n. Risco de loops infinitos → necessidade de limite de iterações e timeout.

---

## 6️⃣ Próximos passos (para o próximo agente – Dom)

1. **Implementar as alterações de modelo** (passos 2‑3 acima).
2. **Criar script de migração** que converta workflows antigos (`type` implícito “plugin”) para a nova estrutura.
3. **Escrever testes unitários** para cada novo tipo de nó.
4. **Atualizar a UI** no cliente (não coberto aqui) usando a nova API de schema.

---

7️⃣ Arquivos a criar/alterar (resumo)
Arquivo Tipo Alteração
server/src/shared/models/workflow-types.ts Edit Adicionar WorkflowNodeType, union de nós, variáveis, schema.
server/src/modules/workflows/executor.ts New/Edit Implementar engine baseada em tipos, suporte a if/loop/code/sub‑workflow.
server/src/modules/workflows/code-runner.ts New Wrapper de vm2 para blocos de código.
server/src/core/routes/workflows.routes.ts Edit Novos GET /schema, /plugins; adaptar respostas às novas models.
server/src/core/repositories/workflow.repository.ts Edit Suporte a drafts, versionamento, migração.
tests/... New Testes para execução de novos nós e validação de schema.

---

**Conclusão**  
Com a extensão do modelo de dados, a evolução da engine e a exposição de metadados via API, o Forge ganhará um editor de workflows comparável ao n8n, permitindo blocos de código, condicionais, loops e sub‑workflows, ao mesmo tempo que mantém segurança e versionamento.

---
