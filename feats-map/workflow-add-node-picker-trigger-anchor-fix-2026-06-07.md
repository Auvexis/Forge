# Workflow Add Node Picker Trigger Anchor Fix

## Problema

O quick-add do `TriggerNode` emitia apenas `sourceId`.

Quando a camera do Vue Flow era movida, o picker do primeiro step abria no fallback antigo em vez de abrir ao lado do botao `+`.

## Tasks

- [x] Task 1: Atualizar contrato para exigir anchor no `TriggerNode`.
- [x] Task 2: Fazer `TriggerNode` enviar `clientX`, `clientY` e `anchorRect`.
- [x] Task 3: Rodar testes alvo, type-check e commitar.
