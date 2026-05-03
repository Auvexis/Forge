# Milestone 1.4 – Global Settings & Configuration Menu

## Task Checklist

### Backend
- [x] **DB Migration (app.db):** Add `global_variables` table via umzug migration
- [x] **Repository:** Create `AppRepository` (`settings` + `global_variables` CRUD)
- [x] **Engine Update:** Inject `env` namespace into `executor.ts` context from `AppRepository`
- [x] **API Layer:** Create `app.routes.ts` (GET/POST/DELETE for preferences & global variables)
- [x] **API Layer:** Register `app.routes.ts` in `server.ts`

### Frontend
- [ ] **Store:** Create `useSettingsStore` (Pinia) — independent state, no dependency on `sidebarStore`
- [ ] **UI Component:** Build `AppGlobalSettings.vue` — mobile-style slide-over with `slide-right` transition
- [ ] **Integration:** Mount `<AppGlobalSettings />` in `App.vue` + bind sidebar settings button
- [ ] **Variables Tab:** Key-value CRUD UI using `BaseInput` + `BaseButton`
- [ ] **Preferences Tab:** Theme & system settings using `BaseSelect` + `BaseSwitch`
