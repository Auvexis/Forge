# Workflow Add Node Picker Cascade Hover Plan

## Objetivo

Trocar o picker de colunas fixas por um picker em cascata:

- Painel 1 abre ao lado do botao que disparou o picker.
- Painel 1 mostra apenas secoes/categorias.
- Hover em uma secao abre o Painel 2 a direita com fade/slide.
- Clique em preset ou plugin com 1 metodo adiciona direto.
- Clique em plugin com varios metodos abre submenu de metodos dentro do Painel 2.
- Picker fecha somente ao clicar fora ou ao adicionar.
- Posicionamento respeita a tela e sobe quando nao houver espaco embaixo.

## Tasks

- [x] Task 1: Contratos TDD do comportamento.
  - `AddNodePanel` nao usa grid de 3 colunas.
  - Usa classes de cascade/secondary/method submenu.
  - Usa hover para categoria.
  - Detecta plugins com metodo unico vs multiplos metodos.
  - Overlay calcula posicao ao lado do botao e clampa verticalmente.

- [x] Task 2: Refatorar UI do `AddNodePanel`.
  - Remover terceira coluna fixa.
  - Remover search visivel do painel 1.
  - Painel 2 aparece no hover com animacao.
  - Submenu de metodos aparece dentro do Painel 2.

- [x] Task 3: Ajustar anchor do overlay.
  - Abrir ao lado do botao.
  - Subir quando faltar espaco embaixo.
  - Manter fechamento por clique fora.

- [x] Task 4: Verificar e commitar.
  - Testes alvo.
  - `npm run type-check`.
  - `npm run build`.
  - Commit.
