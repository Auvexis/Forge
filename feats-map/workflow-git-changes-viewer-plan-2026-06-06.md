# Workflow Git Changes Viewer Plan - 2026-06-06

## Ideia
Criar um `Changes Viewer` dentro do Workflow Editor usando `BaseFloatingWindow.vue`.

O usuário abre pelo Status Bar, vê o `workflow.json` raw, acompanha mudanças em tempo real enquanto edita o workflow, compara contra snapshots Git e consegue navegar/restaurar versões depois.

## Direção de UX
- O botão principal fica na Status Bar como `Snapshots` ou `Changes`.
- O painel abre como floating window dentro do editor.
- O topo do painel tem uma toolbar Git/Snapshots.
- A área principal parece um editor/diff viewer de `workflow.json`.
- Git continua sendo infraestrutura; a UI usa nomes mais claros: `Snapshots`, `Changes`, `Restore`.

## Escopo Recomendado
Fazer em etapas. Não colocar restore, histórico, diff raw e live diff tudo numa task só.

## Task Set 1 - Base do Viewer
- [x] Task 1: Criar componente `WorkflowGitChangesWindow.vue`.
  - Usa `BaseFloatingWindow.vue`.
  - Abre/fecha pelo estado controlado em `WorkflowEditorPage.vue`.
  - Tem header com título `Changes`.
  - Tem toolbar vazia inicialmente com botões desabilitados.

- [x] Task 2: Adicionar botão na Status Bar.
  - Botão `Changes` ou `Snapshots`.
  - Ícone Lucide: `git-compare-arrows` ou `history`.
  - Clique abre/fecha a floating window.
  - Estado ativo quando o painel está aberto.

- [x] Task 3: Mostrar `workflow.json` raw em tempo real.
  - Computed serializa `workflowStore.activeWorkflow` com `JSON.stringify(workflow, null, 2)`.
  - Enquanto o usuário edita nodes/edges/settings, o texto atualiza.
  - Scroll próprio dentro do painel.

## Task Set 2 - Snapshots Git
- [x] Task 4: Backend listar snapshots.
  - Adicionar método no `WorkflowGitSnapshotService`.
  - Usar `git log --format`.
  - Retornar `hash`, `shortHash`, `committedAt`, `message`.
  - Endpoint: `GET /workflows/:workflowId/git/snapshots`.

- [x] Task 5: Backend ler arquivo de snapshot.
  - Usar `git show <hash>:workflow.json`.
  - Validar se commit existe.
  - Retornar workflow JSON raw e parsed.
  - Endpoint: `GET /workflows/:workflowId/git/snapshots/:hash`.

- [x] Task 6: Frontend carregar snapshots no painel.
  - Select/lista no topo.
  - Mostra data + short hash + mensagem.
  - Ao selecionar snapshot, mostra o `workflow.json` daquela versão.

## Task Set 3 - Diff Viewer
- [x] Task 7: Criar util de diff.
  - Comparar `workflow.json` atual contra snapshot selecionado.
  - Usar biblioteca existente se já existir no projeto; se não, adicionar uma dependência leve e focada.
  - Produzir linhas com tipo: `added`, `removed`, `modified`, `unchanged`.

- [x] Task 8: Renderizar diff visual.
  - Linhas verdes para adicionadas.
  - Linhas vermelhas para deletadas.
  - Linhas alteradas com destaque discreto.
  - Numeração de linhas.
  - Modo raw/diff via segmented control.

- [x] Task 9: Live diff enquanto edita.
  - Se painel aberto e snapshot selecionado, recalcular diff quando `activeWorkflow` mudar.
  - Debounce curto para não travar edição.
  - Mostrar badge `Unsaved changes` quando atual difere do snapshot/base salvo.

## Task Set 4 - Restore e Segurança
- [ ] Task 10: Backend restaurar snapshot.
  - Endpoint: `POST /workflows/:workflowId/git/snapshots/:hash/restore`.
  - Lê `workflow.json` do commit.
  - Mantém o mesmo `workflowId`.
  - Salva no repositório atual.
  - Gera novo snapshot depois do restore.

- [ ] Task 11: Frontend confirmar restore.
  - Modal de confirmação.
  - Texto claro: restaurar substitui o workflow atual.
  - Se workflow estiver dirty, pedir confirmação extra ou salvar snapshot antes.

- [ ] Task 12: Atualizar editor após restore.
  - Atualiza `workflowStore.setActiveWorkflow(restored)`.
  - Recarrega Git status/snapshots.
  - Mostra toast de sucesso.

## Testes
- Backend:
  - `workflow-git-snapshot-service.test.ts`
  - Testar listar commits.
  - Testar ler `workflow.json` antigo.
  - Testar restore preservando `workflowId`.

- Frontend:
  - Contract test para Status Bar abrir `WorkflowGitChangesWindow`.
  - Contract test para Chrome/Status Bar não quebrar comandos Git existentes.
  - Contract test para painel ter raw mode, diff mode, snapshot select e restore action.

## Riscos
- Diff em JSON grande pode ficar pesado.
  - Usar debounce e render simples.

- Restore pode sobrescrever trabalho não salvo.
  - Sempre confirmar.
  - Idealmente criar snapshot antes de restore.

- Mostrar Git demais pode assustar usuário final.
  - Chamar a experiência de `Snapshots` e `Changes`.
  - Deixar hash/path como detalhe, não foco.

## Decisão Recomendada
Implementar primeiro o Task Set 1.

Motivo: já entrega valor visual rápido, sem mexer em restore ou Git avançado. Depois entra snapshots, depois diff, depois restore.
