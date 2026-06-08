# Workflow Add Node Picker Edge Aware Search

## Objetivo

Melhorar o cascade picker:

- Abrir para direita/esquerda conforme espaco horizontal.
- Subir/descer conforme espaco vertical.
- Painel 2 abrir para o lado que nao corta na tela.
- Header do Painel 1 ter input sempre focado ao lado de `Add to workflow`.
- Busca global pula categorias e mostra nodes/plugins direto.
- Busca usa match por letras digitadas, nao precisa nome exato.

## Tasks

- [x] Task 1: Contratos TDD.
  - Canvas calcula `secondarySide`.
  - Canvas usa altura/largura total do cascade no clamp.
  - `AddNodePanel` recebe lado do painel secundario.
  - `AddNodePanel` tem input no header e busca global.

- [x] Task 2: Implementar posicionamento edge-aware.
  - Ajustar `getAddNodePickerPosition`.
  - Passar `secondarySide` para o `AddNodePanel`.
  - CSS abrir painel 2 para esquerda/direita.

- [x] Task 3: Implementar busca global.
  - Input sempre focado.
  - Match por letras em sequencia.
  - Resultados diretos no Painel 1.
  - Clique em resultado adiciona direto ou abre submenu.

- [x] Task 4: Verificar e commitar.
  - Testes alvo.
  - `npm run type-check`.
  - `npm run build`.
