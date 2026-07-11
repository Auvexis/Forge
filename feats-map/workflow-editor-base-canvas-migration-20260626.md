# Migrar Workflow Editor para BaseCanvas

## Motivo
- O Workflow Editor ainda depende do Vue Flow para canvas, handles, edges e nodes.
- O Vue Flow causou bugs de alinhamento entre `BaseEdge`, `BaseHandle`, `BaseNode` e `BaseAdvancedNode`.
- O `BaseCanvas` criado para Fabric Pages já validou pan, zoom, drag, seleção e grid sem depender do Vue Flow.
- A migração reduz risco de estagnação da lib externa e centraliza o canvas em código próprio do Fabric.

## Estratégia
- Usar migração paralela com feature flag.
- Manter Vue Flow funcionando até o `BaseCanvas` cobrir o fluxo principal.
- Recriar handles e edges usando coordenadas do próprio canvas.
- Remover Vue Flow só depois da paridade visual e funcional.
- Não modificar comportamento existente do `BaseCanvas`.
- No máximo adicionar props opcionais ou métodos novos ao `BaseCanvas`.
- Preferir adapters/wrappers no Workflow Editor para proteger Fabric Pages.

## Batch 1 - Base paralela
- [x] Criar feature flag para Vue Flow vs BaseCanvas.
- [x] Criar `WorkflowBaseCanvas` sem remover `FabricWorkflowCanvas`.
- [x] Criar adapter de workflow para `BaseCanvasItem`.
- [x] Renderizar canvas vazio, grid, pan e zoom.
- [x] Manter add node panel e inspector fora da troca.
- [x] Confirmar que Fabric Pages não mudou após qualquer ajuste opcional no `BaseCanvas`.

## Batch 2 - Nodes
- [x] Renderizar trigger node legado quando necessário.
- [x] Renderizar todos os node types atuais.
- [x] Passar props equivalentes aos nodes existentes.
- [x] Preservar `BaseNode` e `BaseAdvancedNode` visualmente.
- [x] Persistir drag em `node.ui.positionX/Y`.
- [x] Preservar snap/grid no drag.
- [x] Preservar disabled, selected e execution status.
- [x] Preservar double click para abrir inspector.

## Batch 3 - Handles
- [x] Criar `WorkflowHandle` sem `@vue-flow/core`.
- [x] Criar tipos próprios para `Position` e handle side.
- [x] Migrar `BaseHandle` para usar `WorkflowHandle`.
- [x] Registrar geometria de handle por node.
- [x] Suportar source, target, circle, bar e diamond.
- [x] Suportar handles customizados de `If`, `Loop`, `Switch` e batches.
- [x] Remover dependência de `updateNodeInternals` no caminho BaseCanvas.

## Batch 4 - Edges
- [x] Criar camada SVG própria para edges.
- [x] Calcular anchors por handle em world coordinates.
- [x] Migrar `BaseEdge` sem `@vue-flow/core`.
- [x] Preservar edge idle, running, success, failed e selected.
- [x] Preservar edge configuration dashed.
- [x] Preservar branch filtering por output.
- [x] Preservar labels e edição inline.
- [x] Preservar item count label.
- [x] Preservar toolbar de quick-add e delete.
- [x] Corrigir alinhamento edge/handle sem query no DOM.

## Batch 5 - Conexões
- [x] Recriar preview de conexão durante drag.
- [x] Criar edge ao soltar source em target válido.
- [x] Preservar sourceHandle e targetHandle.
- [x] Preservar regras de handles avançados.
- [x] Preservar auto arrange de config nodes.
- [x] Bloquear conexões inválidas como hoje.
- [x] Cancelar conexão ao soltar no canvas.

## Batch 6 - Seleção e comandos
- [x] Preservar seleção simples.
- [x] Preservar marquee selection.
- [x] Preservar seleção múltipla.
- [x] Migrar selection box e group actions.
- [x] Preservar delete selection.
- [x] Preservar duplicate selection.
- [x] Preservar select all e clear selection.
- [x] Preservar node toolbar.

## Batch 7 - Ações do editor
- [x] Migrar add logic node at viewport center.
- [x] Migrar add plugin node at viewport center.
- [x] Migrar add node at screen point.
- [x] Migrar global drag/drop de nodes.
- [x] Migrar quick-add de node.
- [x] Migrar quick-add entre edges.
- [x] Migrar zoom in, zoom out e reset.
- [x] Migrar fit workflow view.
- [x] Preservar run, stop e logs.

## Batch 8 - Testes e validação
- [x] Adicionar testes de adapter workflow/canvas.
- [x] Adicionar testes de coordenadas handle/edge.
- [x] Adicionar testes de criação e remoção de edge.
- [x] Validar visualmente nodes simples.
- [x] Validar visualmente advanced nodes.
- [x] Validar visualmente branches `if`, `switch`, `loop`.
- [x] Validar zoom, pan, drag e seleção.
- [x] Validar workflow salvo/reaberto.

## Batch 9 - Remoção Vue Flow
- [x] Comparar paridade com feature flag.
- [x] Ativar BaseCanvas como padrão.
- [x] Remover slots e wrappers de Vue Flow.
- [x] Remover imports `@vue-flow/core` do Workflow Editor.
- [x] Remover imports `@vue-flow/background` do Workflow Editor.
- [x] Remover pacotes npm `@vue-flow/core` e `@vue-flow/background`.
- [x] Atualizar testes antigos que assumem Vue Flow.
- [x] Remover feature flag quando estável.

## Batch 10 - Estado e atalhos do editor
- [x] Corrigir o toggle duplicado de `disabled` na Node Toolbar.
- [x] Garantir que disable/enable use a store como fonte única.
- [x] Adicionar `Ctrl/Cmd + Z` para Undo.
- [x] Adicionar `Ctrl/Cmd + Y` para Redo.
- [x] Adicionar `Ctrl/Cmd + B` para alternar o Add Node Panel.
- [x] Ignorar atalhos em inputs, editores e campos editáveis.
- [x] Adicionar testes e executar type-check.

## Batch 11 - Node Picker no canvas vazio
- [x] Reutilizar o Node Picker flutuante do `FabricWorkflowCanvas`.
- [x] Abrir o picker com botão direito apenas no canvas vazio.
- [x] Posicionar o picker no cursor e o novo node no world point correspondente.
- [x] Fechar e limpar o contexto ao cancelar ou selecionar.
- [x] Preservar pan, marquee, seleção e menu de nodes.
- [x] Adicionar testes e executar type-check.

## Batch 12 - Drop de conexão no Node Picker
- [x] Trocar a preview edge vermelha pelo token selecionado do canvas.
- [x] Emitir o handle e a posição ao soltar uma conexão no vazio.
- [x] Abrir o mesmo Node Picker para source e target handles.
- [x] Conectar automaticamente o node escolhido na direção correta.
- [x] Alinhar os handles e preservar source/target handle IDs.
- [x] Limpar drafts ao cancelar e impedir edges parciais.
- [x] Adicionar testes focados e executar type-check.
