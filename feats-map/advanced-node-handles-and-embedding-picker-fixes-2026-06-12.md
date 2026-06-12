# Advanced Node Handles and Embedding Picker Fixes

**Goal:** corrigir handles e Quick Add dos config nodes e tornar a selecao de embeddings orientada por provider e metodo.

**Rules:**
- Trabalhar na branch `dev`.
- TDD antes de mudar comportamento.
- Executar duas tasks por rodada.
- Marcar cada task concluida e fazer commit separado.
- Nao hardcodar providers no core/frontend.

## Task 1: Corrigir contrato e geometria dos handles

- [x] Adicionar `style: 'circle' | 'diamond'` ao handler.
- [x] Adicionar `quickAddAfterConnected?: boolean` ao handler.
- [x] Criar handler compartilhado de config node com source no topo e estilo diamond.
- [x] Migrar Agent e Vector Store config nodes para o handler compartilhado.
- [x] Remover Quick Add lateral indevido dos config nodes.
- [x] Manter Quick Add apos conexao apenas nos handles configurados para multiplas conexoes.
- [x] Fixar handles dos Advanced Nodes na borda inferior quando o Quick Add estiver visivel.
- [x] Adicionar e executar testes de regressao.
- [x] Commit da task.

## Task 2: Selecionar Embedding Models por provider e metodo

- [x] Exibir plugins compativeis como `<Provider> Embedding Model`.
- [x] Abrir submenu com os metodos de embedding do provider selecionado.
- [x] Criar o node `embeddings` com `pluginId` e `methodId` escolhidos.
- [x] Implementar e declarar `createEmbeddings` nos plugins OpenAI e Ollama.
- [x] Preservar filtros por `allowedNodes` e busca contextual.
- [x] Adicionar e executar testes de regressao.
- [x] Commit da task.

## Verificacao

- [x] Executar testes frontend relacionados.
- [x] Executar type-check/build frontend.
- [x] Executar testes e build dos providers OpenAI/Ollama.
- [x] Validar visualmente no Browser em desktop.
- [x] Confirmar console sem novos erros relevantes no host correto.
- [ ] Encerrar todos os processos Node iniciados para QA.
