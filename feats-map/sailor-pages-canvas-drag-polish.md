# Sailor Pages Canvas Drag Polish

Status: completed
Branch: current dev branch. Do not create a new branch.

## Tasks

### - [x] Task 1: Center Initial Canvas

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- Page editor contract test.

Behavior:
- Initial site/page opens with the page centered in the fixed canvas plane.
- Keep current non-free canvas dimensions.

### - [x] Task 2: Default Page Body Layout

Files:
- Page creation/server defaults.
- Existing page renderer tests or page contracts.

Behavior:
- New/default page body uses `width: 100vw`, `min-height: 100vh`, padding `0`, gap `0`, margin `0`.

### - [x] Task 3: Selected Element Accent Dashed Border

Files:
- `client-vue/src/features/web-pages/pages.css`
- Drag/selection contract test.

Behavior:
- Selected canvas element has dashed accent outline with subtle animation.

### - [x] Task 4: Stable Drag/Drop Indicators

Files:
- `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- `client-vue/src/features/web-pages/pages.css`
- Drag prediction contract test.

Behavior:
- Bottom/top indicators render outside the element.
- Directional arrows are visible outside the element.
- Indicators do not intercept pointer events or cause flicker.

### - [x] Task 5: Verification

Commands:
- Focused web-pages client contracts.
- `client-vue npm run type-check`.
