# Workflow Add Node Picker Floating Columns Plan - 2026-06-07

## Status

Nao implementado ainda.

Hoje o `AddNodePanel.vue` continua sendo um painel lateral/lista. Ele ja usa `metadata.categories` do novo SDK e agrupa plugins por categoria, mas ainda nao tem o picker flutuante em colunas como a imagem.

## Objetivo

Transformar o fluxo de adicionar node em um picker flutuante estilo IDE:

- coluna 1: categorias principais;
- coluna 2: plugins/presets daquela categoria;
- coluna 3: actions/metodos do plugin selecionado;
- abrir perto do botao de add node/quick add;
- manter suporte aos contextos de agente: chat model, memory e tool;
- preservar o `AddNodePanel.vue` como componente principal ou dividir internamente sem quebrar chamadas atuais.

## Categorias

Usar as categorias oficiais atuais:

```ts
AI
Core
Flow
Data transformation
Apps
Files
Developer
```

Nao usar `groups`.

Plugins com varias categorias devem aparecer em todas as categorias aplicaveis.

## UX proposta

### Layout

- Container flutuante com 3 colunas independentes.
- Larguras aproximadas:
  - categorias: 286px;
  - plugins/presets: 286px;
  - actions: 286px;
- Altura maxima: baseada no viewport/editor, com scroll interno por coluna.
- Visual escuro usando `tokens.css`.
- Bordas discretas, shadow, radius pequeno, hover claro e states selecionados.
- Sem texto explicativo de feature/tutorial.

### Coluna 1 - Categorias

Itens:

- `AI`
- `Core`
- `Flow`
- `Data transformation`
- `Apps`
- `Files`
- `Developer`

Cada item deve ter:

- icone Lucide;
- titulo;
- descricao curta;
- chevron quando tiver proxima coluna;
- contador opcional de itens.

### Coluna 2 - Plugins e presets

Conteudo depende da categoria selecionada:

- `AI`: AI Agent, plugins de modelos, memory stores, ferramentas AI.
- `Core`: HTTP, Code, Webhook/Trigger, Wait, File core.
- `Flow`: If, Switch, Loop, Merge, Split, Wait/Form.
- `Data transformation`: Set Fields, JSON/CSV/data plugins.
- `Apps`: Google, Slack, Discord, Notion, GitHub, etc.
- `Files`: Google Drive, File, Notion, PDF/file related plugins.
- `Developer`: GitHub, Postgres, Supabase, HTTP/Code.

Regras:

- presets internos e plugins externos aparecem juntos quando fizer sentido;
- plugin com `metadata.utility === true` nao deve ficar escondido, mas deve aparecer por categoria;
- plugin selecionado abre a coluna 3;
- preset sem metodo direto pode ser adicionado ao clicar.

### Coluna 3 - Actions/metodos

Para plugin selecionado:

- listar `manifest.methods`;
- no contexto `agentConfigHandle === 'tool'`, listar apenas metodos com `agentTool.enabled === true`;
- cada action tem icone, label e description;
- clique adiciona o node;
- se nao houver actions, mostrar estado vazio compacto.

Para preset selecionado:

- pode mostrar detalhes simples ou adicionar direto.
- decisao recomendada: adicionar direto para presets internos.

### Busca

Busca unica no topo do picker.

Filtra:

- categorias;
- plugins/presets;
- actions/metodos.

Comportamento:

- se busca encontrar action, manter caminho visivel: categoria -> plugin -> action;
- no primeiro release, pode filtrar coluna atual e autoexpandir categorias com match.

## Arquitetura proposta

### Componentes

Manter `AddNodePanel.vue` como entrypoint publico, mas dividir internamente:

- `AddNodePanel.vue`
  - controla props atuais;
  - carrega plugins;
  - decide contexto;
  - emite callbacks atuais.

- `AddNodePickerColumn.vue`
  - renderiza uma coluna com header opcional e lista.

- `AddNodePickerItem.vue`
  - item reutilizavel para categoria, plugin, preset e action.

- `addNodePickerModel.ts`
  - funcoes puras para montar categorias, presets, plugins e actions;
  - facil de testar.

### Estado

```ts
selectedCategory: PluginCategory | null
selectedPluginId: string | null
search: string
```

Derivados:

```ts
categoryItems
secondColumnItems
thirdColumnItems
```

### Dados

Usar apenas:

- `PluginSummary`;
- `metadata.categories`;
- `manifest.methods`;
- `agentCapabilities`;
- presets locais existentes no workflow editor.

Nao adicionar contrato backend novo nesta primeira versao.

## Compatibilidade

Manter callbacks atuais:

```ts
onAddLogicNode
onAddPluginNode
onAddAgentToolNode
agentConfigHandle
```

Isso evita mexer no canvas agora.

## Riscos

- `AddNodePanel.vue` ja esta grande.
  - Mitigacao: extrair model puro e componentes pequenos.

- Plugin aparece em varias categorias e pode duplicar visualmente.
  - Mitigacao: duplicacao por categoria e esperada; dentro da mesma coluna nao duplicar.

- Contextos de agente podem quebrar se misturar presets normais com model/memory/tool.
  - Mitigacao: testes separados por contexto.

- Layout flutuante pode cortar em telas pequenas.
  - Mitigacao: usar `max-width`, `max-height`, scroll por coluna e fallback responsivo para 1 coluna no mobile.

## Tasks

### Batch 1 - Model e contratos

- [x] Task 1: Criar testes do model do picker.
  - Categoria usa `metadata.categories`.
  - Plugin com varias categorias aparece em todas.
  - Actions respeitam `agentConfigHandle === 'tool'`.

- [x] Task 2: Criar `addNodePickerModel.ts`.
  - Gerar categorias.
  - Gerar itens da segunda coluna.
  - Gerar actions da terceira coluna.

- [x] Task 3: Atualizar contratos do `AddNodePanel`.
  - Exigir layout em 3 colunas.
  - Exigir scroll independente.
  - Exigir tokens/classes novas.
  - Commit.

### Batch 2 - UI flutuante em colunas

- [x] Task 4: Criar componentes internos do picker.
  - `AddNodePickerColumn.vue`.
  - `AddNodePickerItem.vue`.

- [x] Task 5: Refatorar `AddNodePanel.vue`.
  - Usar layout em colunas.
  - Manter props/callbacks atuais.
  - Remover view antiga de categoria/action quando nao for mais usada.

- [x] Task 6: Estilizar com `tokens.css`.
  - Fundo, borda, shadow, hover, selected.
  - Scrollbar discreta por coluna.
  - Responsivo.
  - Commit.

### Batch 3 - Contextos e verificacao

- [ ] Task 7: Ajustar contextos de agente.
  - Chat model mostra providers compativeis.
  - Memory mostra presets e memory stores.
  - Tool mostra plugins/actions agent-enabled.

- [ ] Task 8: Testar integracao visual e funcional.
  - Add logic node.
  - Add plugin node.
  - Add agent tool node.
  - Busca.
  - Scroll das 3 colunas.

- [ ] Task 9: Rodar verificacoes.
  - Testes alvo.
  - `npm run type-check`.
  - `npm run build`.
  - Browser/Playwright se ferramenta disponivel.
  - Commit.

## Criterios de aceite

- Picker abre como painel flutuante em colunas.
- Categoria -> plugin/preset -> action funciona.
- Plugins aparecem em todas as `metadata.categories`.
- Actions de agent tool filtram por `agentTool.enabled`.
- Scroll com mouse funciona em cada coluna.
- Visual usa tokens e parece app real, sem landing/UX decorativa.
- Build e testes passam.
