# Improve Fabric Pages Follow-Up Fixes

Resumo curto: corrigir multiseleção, save/publicação, slugs/URLs, assets e captura global de erros no Fabric Pages.

## Batch 1 - Multiselect UX
- [x] Criar selection box única envolvendo todos os elementos selecionados.
- [x] Mostrar 4 handles e toolbar na selection box do grupo.
- [x] Remover toolbar individual quando houver multiseleção.
- [x] Mover "Editing N selected elements" para a Topbar direita.
- [x] Usar ícone e visual clean para o status de multiseleção.
- [x] Garantir selection box abaixo dos painéis Explorer e Inspector.
- [x] Manter multiseleção focada após salvar.
- [x] Corrigir Ctrl/Cmd multi-select no canvas para bater com a seleção da Tree.
- [x] Add/adjust tests.
- [x] Run focused tests and build.
- [x] Commit.

## Batch 2 - Page Metadata And Save
- [x] Persistir favicon quando asset é arrastado para o input e salvo.
- [x] Separar slug do arquivo e URL pública da page.
- [x] Permitir URLs com barras, ex: `/meusite/signup`.
- [x] Marcar projeto como alterado ao criar nova Page.
- [x] Salvar nova Page sem precisar editar outros campos.
- [x] Manter posição da nova Page após F5.
- [x] Corrigir Inspector Style com múltiplas pages abertas.
- [x] Add/adjust tests.
- [x] Run focused tests and build.
- [x] Commit.

## Batch 3 - Output Structure And Publish Runtime
- [x] Criar `.css` dentro da pasta da page.
- [x] Criar `.js` dentro da pasta da page.
- [x] Remover geração das pastas root `css/` e `js/`.
- [x] Manter somente `assets/` e `pages/` no root publicado.
- [x] Adicionar ID seguro na URL publicada para evitar conflito entre profiles/projetos.
- [x] Corrigir preview publicado que retorna "Page not found".
- [x] Add/adjust tests.
- [x] Run focused tests and build.
- [x] Commit.

## Batch 4 - Explorer Assets And Preview Actions
- [x] Adicionar drag preview animado nos Assets do Explorer.
- [x] Reutilizar padrão visual do drag preview do Toolbox.
- [x] Adicionar botão na toolbar da page no canvas para abrir preview em nova aba.
- [x] Garantir tooltip e ícone claro para o botão de preview.
- [x] Add/adjust tests.
- [x] Run focused tests and build.
- [x] Commit.

## Batch 5 - Global Error Capture
- [x] Conectar erros do Fabric Pages ao toast global.
- [x] Capturar `console.error` disparado no navegador.
- [x] Capturar erros não tratados de promise.
- [x] Capturar erros globais de runtime.
- [x] Evitar silenciar erros internos de Pages.
- [x] Add/adjust tests.
- [x] Run focused tests and build.
- [x] Commit.
