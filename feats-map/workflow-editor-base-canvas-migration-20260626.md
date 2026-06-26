# Migrar Workflow Editor para BaseCanvas

## Motivo
- O Workflow Editor ainda depende do Vue Flow para canvas, handles, edges e nodes.
- O Vue Flow causou bugs de alinhamento entre `BaseEdge`, `BaseHandle`, `BaseNode` e `BaseAdvancedNode`.
- O `BaseCanvas` criado para Sailor Pages já validou pan, zoom, drag, seleção e grid sem depender do Vue Flow.
- A migração reduz risco de estagnação da lib externa e centraliza o canvas em código próprio do Sailor.

## Estratégia
- Usar migração paralela com feature flag.
- Manter Vue Flow funcionando até o `BaseCanvas` cobrir o fluxo principal.
- Recriar handles e edges usando coordenadas do próprio canvas.
- Remover Vue Flow só depois da paridade visual e funcional.
- Não modificar comportamento existente do `BaseCanvas`.
- No máximo adicionar props opcionais ou métodos novos ao `BaseCanvas`.
- Preferir adapters/wrappers no Workflow Editor para proteger Sailor Pages.

## Batch 1 - Base paralela
- [x] Criar feature flag para Vue Flow vs BaseCanvas.
- [x] Criar `WorkflowBaseCanvas` sem remover `SailorWorkflowCanvas`.
- [x] Criar adapter de workflow para `BaseCanvasItem`.
- [x] Renderizar canvas vazio, grid, pan e zoom.
- [x] Manter add node panel e inspector fora da troca.
- [x] Confirmar que Sailor Pages não mudou após qualquer ajuste opcional no `BaseCanvas`.

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
- [ ] Recriar preview de conexão durante drag.
- [ ] Criar edge ao soltar source em target válido.
- [ ] Preservar sourceHandle e targetHandle.
- [ ] Preservar regras de handles avançados.
- [ ] Preservar auto arrange de config nodes.
- [ ] Bloquear conexões inválidas como hoje.
- [ ] Cancelar conexão ao soltar no canvas.

## Batch 6 - Seleção e comandos
- [ ] Preservar seleção simples.
- [ ] Preservar marquee selection.
- [ ] Preservar seleção múltipla.
- [ ] Migrar selection box e group actions.
- [ ] Preservar delete selection.
- [ ] Preservar duplicate selection.
- [ ] Preservar select all e clear selection.
- [ ] Preservar node toolbar.

## Batch 7 - Ações do editor
- [ ] Migrar add logic node at viewport center.
- [ ] Migrar add plugin node at viewport center.
- [ ] Migrar add node at screen point.
- [ ] Migrar global drag/drop de nodes.
- [ ] Migrar quick-add de node.
- [ ] Migrar quick-add entre edges.
- [ ] Migrar zoom in, zoom out e reset.
- [ ] Migrar fit workflow view.
- [ ] Preservar run, stop e logs.

## Batch 8 - Testes e validação
- [ ] Adicionar testes de adapter workflow/canvas.
- [ ] Adicionar testes de coordenadas handle/edge.
- [ ] Adicionar testes de criação e remoção de edge.
- [ ] Validar visualmente nodes simples.
- [ ] Validar visualmente advanced nodes.
- [ ] Validar visualmente branches `if`, `switch`, `loop`.
- [ ] Validar zoom, pan, drag e seleção.
- [ ] Validar workflow salvo/reaberto.

## Batch 9 - Remoção Vue Flow
- [ ] Comparar paridade com feature flag.
- [ ] Ativar BaseCanvas como padrão.
- [ ] Remover slots e wrappers de Vue Flow.
- [ ] Remover imports `@vue-flow/core` do Workflow Editor.
- [ ] Remover imports `@vue-flow/background` do Workflow Editor.
- [ ] Atualizar testes antigos que assumem Vue Flow.
- [ ] Remover feature flag quando estável.
