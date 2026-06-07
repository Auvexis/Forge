# Fix Add Node Picker Position

## Problema

O novo `AddNodePanel` ficou correto por dentro, mas ainda abre dentro do `AppPanel` lateral antigo.

Resultado: o picker nasce na lateral direita, nao onde o usuario clicou/soltou o handle.

## Objetivo

Abrir o picker como overlay do canvas, ancorado na posicao do cursor.

## Tasks

- [x] Task 1: Criar contrato do fluxo novo.
  - Eventos de quick-add carregam `clientX/clientY`.
  - `SailorWorkflowCanvas` tem estado de overlay do picker.
  - Nao usar `panelStore.togglePanel` para Add Node.

- [x] Task 2: Implementar overlay no canvas.
  - Passar coordenada do clique em `BaseNode`, `QuickAddButton`, `BaseEdge` e empty state.
  - Abrir `AddNodePanel` dentro do canvas.
  - Fechar ao adicionar node e ao clicar fora.

- [x] Task 3: Verificar.
  - Testes alvo.
  - `npm run type-check`.
  - Commit.
