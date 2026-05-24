# Sailor Pages: Toolbar inferior e controles dev no Inspector

## Contexto

Melhorar a nova feature de Sailor Pages com uma toolbar estilo Figma mais usavel, Inspector mais completo e edicao livre para devs.

## Decisoes

- Toolbar fica embaixo por padrao.
- Toolbar pode ser movida por um handle do lado direito.
- Posicao da toolbar nao sera salva em `localStorage`; ao recarregar volta para a posicao original.
- Toolbar deve respeitar topbar, painel esquerdo e painel direito.
- Elementos da toolbar terao tooltip.
- Custom CSS e Custom JS serao livres, persistidos e publicados para uso por devs.
- Custom CSS/JS deve usar `BaseCodeEditor.vue`.
- Inspector podera editar `id`, `class` e atributos HTML do elemento.
- Double click no canvas abre o Inspector e seleciona o elemento.

## Tasks

- [x] Criar contratos RED para toolbar inferior, drag handle, tooltip e sem storage.
- [ ] Criar contratos RED para Inspector editar `id`, `class`, atributos, Custom CSS e Custom JS.
- [ ] Criar contratos RED para render/editor publicar `id`, `class`, atributos, CSS e JS livres.
- [ ] Criar contratos RED para double click no canvas abrir o Inspector.
- [x] Implementar toolbar inferior movel com bounds de topbar/paineis.
- [x] Implementar tooltips nos elementos da toolbar.
- [ ] Implementar painel de identidade/atributos no Inspector.
- [ ] Implementar Custom CSS/JS com `BaseCodeEditor.vue`.
- [ ] Atualizar renderer/editor/backend para persistir e publicar CSS/JS/atributos livres.
- [ ] Separar controles de estilo por secoes simples.
- [ ] Adicionar mais opcoes CSS no Inspector e allowlists necessarias.
- [ ] Abrir Inspector no double click do canvas.
- [ ] Rodar contratos, type-check e build.
- [ ] Atualizar este checklist e fazer commits por task concluida.
