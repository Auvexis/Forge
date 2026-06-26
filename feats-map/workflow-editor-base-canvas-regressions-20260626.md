# Corrigir regressões do Workflow BaseCanvas

## Motivo
- A Batch 9 removeu Vue Flow do Workflow Editor.
- O novo canvas precisa preservar drag, handles, quick add e edge alignment.
- O `BaseCanvas` compartilhado deve continuar seguro para Sailor Pages.

## Tasks
- [x] Corrigir drag com snap sem o mouse escapar do node.
- [x] Impedir drag do node ao puxar handle input/output.
- [x] Alinhar node criado pelo Quick Add ao ponto esperado.
- [x] Recalcular edges quando o canvas muda de tamanho.
- [x] Bloquear seleção nativa de texto/imagem durante drag.
- [x] Validar Workflow Editor e Sailor Pages.
