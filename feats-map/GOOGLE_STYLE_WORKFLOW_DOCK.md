# Google Style Workflow Dock

- [x] Task 1: criar modelo tipado de menus/actions com teste TDD
- [x] Task 2: adicionar CSS isolado do chrome
- [x] Task 3: criar header e menu bar usando dropdown real existente
- [x] Task 4: criar toolbar
- [x] Task 5: compor WorkflowEditorChrome
- [x] Task 6: conectar chrome na pagina e expor zoom/fit no canvas
- [x] Task 7: QA visual/responsivo e polish
- [x] Task 8: apos migracao, aposentar dock antigo se nao houver uso

Notas:
- Nao mexer em plugins. Feature fica no client-vue workflow editor.
- Menus habilitados precisam disparar acao real.
- Itens sem acao real ficam desabilitados com motivo.
- `BaseMiniMenu` nao serve para menu dropdown; usar `AppDropdownMenu`.
