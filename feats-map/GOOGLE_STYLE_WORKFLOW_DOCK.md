# Google Style Workflow Dock

- [ ] Task 1: criar modelo tipado de menus/actions com teste TDD
- [ ] Task 2: adicionar CSS isolado do chrome
- [ ] Task 3: criar header e menu bar usando dropdown real existente
- [ ] Task 4: criar toolbar
- [ ] Task 5: compor WorkflowEditorChrome
- [ ] Task 6: conectar chrome na pagina e expor zoom/fit no canvas
- [ ] Task 7: QA visual/responsivo e polish
- [ ] Task 8: apos migracao, aposentar dock antigo se nao houver uso

Notas:
- Nao mexer em plugins. Feature fica no client-vue workflow editor.
- Menus habilitados precisam disparar acao real.
- Itens sem acao real ficam desabilitados com motivo.
- `BaseMiniMenu` nao serve para menu dropdown; usar `AppDropdownMenu`.
