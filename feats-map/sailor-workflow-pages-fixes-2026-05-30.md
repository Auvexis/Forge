# Sailor Workflow And Pages Fixes - 2026-05-30

## Regras

- [x] Usar TDD para features e bug fixes com mudanca de comportamento.
- [x] Nao criar branch nova; trabalhar na branch `dev`.
- [x] Manter plugins genericos e sem dependencia direta de core/engines/outros plugins.
- [x] Commitar cada task concluida com stage seletivo.

## Workflow Editor

- [x] Plugin Trigger: usar icone da integracao selecionada.
- [x] Plugin Trigger: exibir evento da integracao selecionada, fallback `On Message`.
- [x] Plugin Trigger: usar visual de PluginNode, sem background/borda divergente.
- [x] BaseEdge: exibir contagem de items trafegados na ultima execucao sem colidir com toolbar.
- [x] BaseEdge: duplo clique edita label inline dentro da edge.
- [x] BaseEdge: remover botao de adicionar label da toolbar.
- [x] Execution Panel: ordenar execucoes de cima para baixo.
- [x] Autosave: ficar desabilitado quando editor abre sem workflow persistido.
- [x] Nodes: adicionar botao de disable na toolbar.
- [x] Nodes: node disabled fica escuro/opacidade baixa.
- [x] Nodes: workflow execution pula nodes disabled.

## Sailor Pages

- [x] Toolbar de elemento filho nao deve ser cortada por parent com overflow hidden.
- [x] Preview `pages/*.html` deve renderizar blocos adicionados.
- [x] Custom CSS/JS de elemento deve ser aplicado no preview/publish.
- [x] Tree permite multi-selecao de elementos do mesmo tipo.
- [x] Inspector edita elementos selecionados do mesmo tipo em lote.
- [x] Pseudo classes em custom CSS funcionam nos elementos.
- [x] Code Editor CSS tem intellisense.
