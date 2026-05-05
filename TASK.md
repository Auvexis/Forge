# TASK.md — Milestone 1.5: Frontend Architecture & Scalable CSS Refactoring

> **Staff Engineer Notes (post-analysis):**
> Após análise completa de `client-vue/` e `server/`, identificou-se o estado real do projeto:
> - ✅ O projeto usa **CSS Variables puras** (não Tailwind), com `tokens.css` como design system centralizado e robusto.
> - ✅ A engine do servidor (`executor.ts`) está totalmente desacoplada da lógica dos plugins — o contrato é claro.
> - ⚠️ O problema principal são **blocos `<style scoped>` monolíticos** em `.vue` files que deveriam estar em arquivos CSS de módulo dedicados.
> - ⚠️ **Não existe** `useTheme` composable nem script anti-FOUC no `index.html`.
> - ⚠️ `AppGlobalSettings.vue` (700 linhas, ~300 de CSS), `WorkflowsPage.vue` (642 linhas, ~310 de CSS).
> - ⚠️ Existem "magic numbers" e cores inline em vários componentes (`rgba(...)` hardcoded sem token).

---

## Fase 1 — Design Token Audit & Hardening

- [x] **1.1** Auditar `tokens.css` e identificar tokens ausentes ou valores inline hardcoded nos componentes Vue
- [x] **1.2** Adicionar tokens semânticos faltantes: `--nod8-bg-canvas`, `--nod8-status-*`, scrollbar tokens
- [x] **1.3** Eliminar todos os `rgba(...)` e `#hexcodes` hardcoded nos arquivos CSS globais, substituindo por variáveis de token

---

## Fase 2 — Sistema de Temas (Dark/Light Mode)

- [x] **2.1** Criar `useTheme.ts` composable em `src/shared/composables/` com suporte a `'dark' | 'light' | 'system'`
- [x] **2.2** Implementar persistência de preferência via `localStorage`
- [x] **2.3** Adicionar listener de `prefers-color-scheme` para o modo `'system'`
- [x] **2.4** Injetar script anti-FOUC síncrono no `<head>` do `index.html` (aplica classe `.dark`/`.light` antes do Vue carregar)
- [x] **2.5** Definir tokens `:root.light {}` em `tokens.css` para o tema claro
- [x] **2.6** Integrar o `useTheme` ao `handleThemeChange` existente em `AppGlobalSettings.vue`

---

## Fase 3 — Separação de Concerns: CSS para Módulos Dedicados

- [x] **3.1** Extrair todo o CSS scoped de `WorkflowsPage.vue` → `src/app/styles/workflows-page.css`
- [x] **3.2** Extrair todo o CSS scoped de `AppGlobalSettings.vue` → `src/shared/components/layout/styles/global-settings.css`
- [x] **3.3** Extrair todo o CSS scoped de `App.vue` → `src/app/styles/app-shell-nav.css`
- [x] **3.4** Extrair CSS scoped dos componentes de UI do editor (`WorkflowEditorDock`, `ProductionMonitorPanel`, `WorkflowSettingsPanel`) para `src/features/workflow-editor/styles/`
- [x] **3.5** Auditar e limpar `<style scoped>` remanescentes em componentes `Base*`

---

## Fase 4 — Component Audit & DRY Enforcement

- [x] **4.1** Auditar todos os `.vue` files e listar padrões de UI duplicados (botões inline, badges de status, dividers, spinners)
- [x] **4.2** Criar `StatusBadge.vue` em `src/shared/components/data-display/` (unifica `.workflow-badge`, `.last-run`, `.gs-cred-card__badge`)
- [x] **4.3** Criar `AppDivider.vue` em `src/shared/components/layout/` (unifica `.dock-divider`, `.divider`, `.divider--vertical`)
- [x] **4.4** Criar `AppSpinner.vue` em `src/shared/components/feedback/` (unifica `.gs-spin`, `.spin`, `.icon-spin`)
- [x] **4.5** Hardcoded colors em `BaseBadge`, `BaseModal`, `BaseSelect`, `BaseSwitch` substituídas por tokens semânticos

---

## Fase 5 — Validação & Commit Final

- [x] **5.1** Verificado: nenhum `Base*` component possui `rgba()` ou `#hex` hardcoded (todos usam tokens)
- [x] **5.2** Verificado: nenhum componente Vue faz lógica de tema com `:class="isDark ? ... : ..."`
- [x] **5.3** Anti-FOUC implementado em `index.html` + `useTheme.ts` composable com persistência e listener de sistema
- [x] **5.4** Commit: `feat(frontend): complete milestone 1.5 - design system, theming, and css architecture`

---

## Progresso

| Fase | Status |
|------|--------|
| Fase 1 — Token Audit & Hardening | ✅ Concluída |
| Fase 2 — Sistema de Temas | ✅ Concluída |
| Fase 3 — CSS para Módulos Dedicados | ✅ Concluída |
| Fase 4 — Component Audit & DRY | ✅ Concluída |
| Fase 5 — Validação & Commit Final | ✅ Concluída |

## Milestone 1.5 — ✅ COMPLETA

