# Sailor Pages MVP

Source plan: `docs/superpowers/plans/2026-05-23-sailor-pages-mvp.md`

Rules:
- Use branch `dev`; do not create a new branch.
- Keep pages scoped per active profile.
- Start the page creator canvas empty.
- Use shared/base components from `client-vue/src/shared/components/`.
- Use `AppPanel.vue`, `AppConfirmPanel.vue`, and `GlobalAppPanel.vue` for menus/panels.
- Use `tokens.css` variables; add feature CSS only inside `client-vue/src/features/web-pages/` if needed.
- Test important backend, utility, store, contract, and security behavior; avoid broad browser testing for every small UI detail.

Tasks:
- [x] Task 1: Backend page contracts
- [x] Task 2: Backend repository
- [x] Task 3: Safe page renderer
- [x] Task 4: Page service
- [x] Task 5: Page action execution
- [x] Task 6: Backend routes
- [x] Task 7: Frontend API and types
- [x] Task 8: Block tree utilities
- [ ] Task 9: Style and CSS sanitization utilities
- [ ] Task 10: Form schema import utility
- [ ] Task 11: Pages stores
- [ ] Task 12: Page management UI
- [ ] Task 13: Editor canvas and block renderer
- [ ] Task 14: Block library and drop zones
- [ ] Task 15: Inspector panels
- [ ] Task 16: Form import panel
- [ ] Task 17: Preview and publish UX
- [ ] Task 18: Published page runtime actions
- [ ] Task 19: Security hardening pass
- [ ] Task 20: End-to-end smoke workflow
- [ ] Task 21: Full verification and stabilization
