# Workflow Node Drag History

## Motivo

O histórico registra cada movimento intermediário do drag. Um drag deve gerar apenas uma ação de Undo/Redo após o usuário soltar o mouse.

## Tasks

- [x] Adicionar eventos opcionais de início e fim do drag no BaseCanvas.
- [x] Agrupar alterações do drag em uma única entrada de histórico.
- [x] Integrar o WorkflowBaseCanvas sem alterar o comportamento do Sailor Pages.
- [x] Cobrir o fluxo com testes e type-check.
- [x] Commitar a correção na branch dev.
