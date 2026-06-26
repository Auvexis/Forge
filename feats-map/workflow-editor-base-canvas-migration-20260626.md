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

## Tarefas
- [ ] Criar adapter de workflow para `BaseCanvasItem`.
- [ ] Criar `WorkflowBaseCanvas` paralelo ao `SailorWorkflowCanvas`.
- [ ] Renderizar nodes atuais dentro do `BaseCanvas`.
- [ ] Persistir drag de nodes em `node.ui.positionX/Y`.
- [ ] Criar registry próprio de handles por node.
- [ ] Recriar `BaseHandle` sem `@vue-flow/core`.
- [ ] Criar camada SVG própria para edges.
- [ ] Calcular edges por source/target handle em world coordinates.
- [ ] Migrar labels, toolbar e delete de edge.
- [ ] Recriar preview de conexão entre handles.
- [ ] Migrar criação de edge por drag.
- [ ] Migrar quick-add de node e edge.
- [ ] Migrar seleção múltipla, delete e duplicate.
- [ ] Migrar zoom in, zoom out, reset e fit view.
- [ ] Adicionar testes de contrato para coordenadas de handle/edge.
- [ ] Validar visualmente nodes simples, advanced nodes e branches.
- [ ] Ativar feature flag para comparação Vue Flow vs BaseCanvas.
- [ ] Remover dependências Vue Flow do Workflow Editor após paridade.
