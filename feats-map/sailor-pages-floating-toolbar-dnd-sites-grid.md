# Sailor Pages Floating Toolbar, Drag/Drop e Sites Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir nested drag/drop, edição de ID pela Tree, toolbar rápida no Canvas, delete fácil de Page, floating toolbar de elementos e nova tela grid de Sites/Pages.

**Architecture:** Manter Sailor Pages dentro de `client-vue/src/features/web-pages/`. Drag/drop fica centralizado em helpers pequenos e store do editor; UI nova fica em componentes Vue focados. Não mexer em server nem em plugins.

**Tech Stack:** Vue 3, Pinia, TypeScript, Node test contracts, `BaseButton.vue`, `BaseModal.vue`, CSS atual em `pages.css`.

---

## Regras Do DEFAULT_PROMPT

- Usar branch atual/dev. Não criar branch nova.
- Criar este plano em `feats-map/` antes de implementar.
- Feature nova deve seguir TDD/contract test antes do código.
- Bug simples pode ir sem teste só se baixo risco; aqui o drag/drop e rename de ID terão testes porque podem quebrar árvore.
- Ao implementar: completar task, marcar checkbox, rodar verificação, fazer commit.
- Não quebrar regra de plugins: esta mudança fica no frontend da feature `web-pages`.

## Arquivos

- Modify: `client-vue/src/features/web-pages/utils/blockTree.ts`
- Modify/Test: `client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts`
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify/Test: `client-vue/src/features/web-pages/stores/__tests__/page-editor.store.test.ts`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockLibrary.vue`
- Create: `client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue`
- Create: `client-vue/src/features/web-pages/components/PageCreateSiteModal.vue`
- Modify: `client-vue/src/features/web-pages/components/PagesList.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Modify/Create tests under: `client-vue/src/features/web-pages/components/__tests__/`

## Task 1: Baseline e Contratos De Segurança

**Files:**
- Modify: `feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md`

- [x] **Step 1: Rodar testes atuais da feature**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/utils/__tests__/blockTree.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PagesList.contract.test.ts
```

Expected: todos passam antes de mexer.

- [x] **Step 2: Rodar type-check atual**

Run:

```powershell
cd client-vue
npm run type-check
```

Expected: passa, ou registrar erro preexistente antes de editar.

- [x] **Step 3: Commit**

```powershell
git add feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "docs: plan sailor pages dnd toolbar improvements"
```

## Task 2: Corrigir Nested Drag/Drop e Tree Drop

**Files:**
- Modify: `client-vue/src/features/web-pages/utils/blockTree.ts`
- Modify/Test: `client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts`
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts`

- [x] **Step 1: Escrever teste de move inside entre níveis**

Adicionar em `blockTree.test.ts`:

```ts
it('moves a sibling inside a container', () => {
  const result = moveBlock(tree(), 'footer_1', 'section_1', 'inside')

  assert.deepEqual(result.map((block) => block.id), ['section_1'])
  assert.deepEqual(result[0]?.children?.map((block) => block.id), ['text_1', 'footer_1'])
})
```

- [x] **Step 2: Escrever teste de insert inside em container aninhado**

Adicionar:

```ts
it('inserts inside a nested container', () => {
  const nested: PageBlock[] = [
    {
      id: 'section_1',
      tag: 'section',
      children: [{ id: 'div_1', tag: 'div', children: [] }],
    },
  ]

  const result = insertBlock(nested, 'div_1', 'inside', createBlock('text', 'text_2'))

  assert.deepEqual(result[0]?.children?.[0]?.children?.map((block) => block.id), ['text_2'])
})
```

- [x] **Step 3: Rodar teste e confirmar falha/reprodução**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/utils/__tests__/blockTree.test.ts
```

Expected: se já passar, bug está na UI. Continuar para Tree/Canvas.

- [x] **Step 4: Adicionar contrato para Tree aceitar drop before/inside/after**

Adicionar em `BlockTreePanel.contract.test.ts`:

```ts
it('tree rows support dropping blocks before, inside and after another block', () => {
  const source = read('src/features/web-pages/components/BlockTreePanel.vue')

  assert.match(source, /@dragover\.prevent/)
  assert.match(source, /@drop\.prevent/)
  assert.match(source, /dropPosition/)
  assert.match(source, /move-block/)
  assert.match(source, /position: dropPosition\(event, block\)/)
})
```

- [x] **Step 5: Implementar emits de drop na Tree**

Em `BlockTreePanel.vue`:

```ts
defineEmits<{
  'add-page': []
  select: [blockId: string]
  'select-page': [pageId: string]
  'delete-page': [pageId: string]
  'duplicate-page': [pageId: string]
  'delete-block': [blockId: string]
  'duplicate-block': [blockId: string]
  'move-block': [payload: { targetId: string; position: InsertPosition; draggedId: string }]
}>()
```

Adicionar nos rows de block:

```vue
@dragover.prevent="onDragOver($event, block)"
@drop.prevent="onDrop($event, block)"
```

E funções:

```ts
import type { InsertPosition } from '../utils/blockTree.ts'

function onDrop(event: DragEvent, block: PageBlock) {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return
  const parsed = JSON.parse(raw) as { blockId?: string }
  if (!parsed.blockId) return
  emit('move-block', { targetId: block.id, position: dropPosition(event, block), draggedId: parsed.blockId })
}

function dropPosition(event: DragEvent, block: PageBlock): InsertPosition {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientY - rect.top) / rect.height
  if (ratio < 0.25) return 'before'
  if (ratio > 0.75) return 'after'
  return blockChildCount(block) >= 0 ? 'inside' : 'after'
}
```

Obs: no código final, `emit` deve ser salvo em `const emit = defineEmits...`.

- [x] **Step 6: Propagar move-block em recursão e PageEditor**

Em todos os `<BlockTreePanel ...>` filhos, adicionar:

```vue
@move-block="$emit('move-block', $event)"
```

Em `PageEditor.vue`, no painel:

```vue
@move-block="moveBlockFromTree"
```

Adicionar função:

```ts
function moveBlockFromTree(payload: { targetId: string; position: InsertPosition; draggedId: string }) {
  editorStore.moveBlock(payload.draggedId, payload.targetId, payload.position)
}
```

- [x] **Step 7: Rodar testes**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/utils/__tests__/blockTree.test.ts
npm exec tsx src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit**

```powershell
git add client-vue/src/features/web-pages/utils/blockTree.ts client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/components/BlockTreePanel.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "fix: support nested page element drops"
```

## Task 3: Editar ID Do Elemento Com Duplo Clique Na Tree

**Files:**
- Modify/Test: `client-vue/src/features/web-pages/utils/blockTree.ts`
- Modify/Test: `client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts`
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify/Test: `client-vue/src/features/web-pages/stores/__tests__/page-editor.store.test.ts`
- Modify: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts`

- [x] **Step 1: Testar rename de ID único**

Adicionar em `blockTree.test.ts`:

```ts
import { renameBlockId } from '../blockTree.ts'

it('renames a block id when the next id is unique', () => {
  const result = renameBlockId(tree(), 'text_1', 'hero_title')

  assert.equal(result[0]?.children?.[0]?.id, 'hero_title')
})

it('rejects duplicate block ids', () => {
  const result = renameBlockId(tree(), 'text_1', 'footer_1')

  assert.deepEqual(result, tree())
})
```

- [x] **Step 2: Implementar helper**

Em `blockTree.ts`:

```ts
export function renameBlockId(tree: PageBlock[], currentId: string, nextId: string): PageBlock[] {
  const normalized = nextId.trim()
  if (!normalized || normalized === currentId) return tree
  if (findBlock(tree, normalized)) return tree

  return tree.map((block) => ({
    ...block,
    id: block.id === currentId ? normalized : block.id,
    children: renameBlockId(block.children ?? [], currentId, normalized),
  }))
}
```

- [x] **Step 3: Store expõe renameBlockId**

Em `page-editor.store.ts`, importar helper e adicionar:

```ts
function renameBlockId(blockId: string, nextId: string) {
  const normalized = nextId.trim()
  if (!normalized) return false
  if (findTreeBlock(blocks.value, normalized)) return false
  mutate(() => {
    blocks.value = renameTreeBlockId(blocks.value, blockId, normalized)
    selectedBlockId.value = normalized
    selectedTarget.value = { type: 'block', blockId: normalized }
  })
  return true
}
```

Retornar `renameBlockId`.

- [x] **Step 4: Tree mostra ID editável por duplo clique**

Em `BlockTreePanel.vue`, trocar área do ID/tag por chip de ID:

```vue
<input
  v-if="editingBlockId === block.id"
  v-model="draftBlockId"
  class="web-page-tree__id-input"
  @click.stop
  @keydown.enter.prevent="commitBlockId(block.id)"
  @keydown.esc.prevent="cancelBlockIdEdit"
  @blur="commitBlockId(block.id)"
/>
<button
  v-else
  type="button"
  class="web-page-tree__id"
  title="Double click to edit ID"
  @click.stop="$emit('select', block.id)"
  @dblclick.stop="startBlockIdEdit(block.id)"
>
  {{ block.id }}
</button>
```

Adicionar refs:

```ts
const editingBlockId = ref<string | null>(null)
const draftBlockId = ref('')

function startBlockIdEdit(blockId: string) {
  editingBlockId.value = blockId
  draftBlockId.value = blockId
}

function cancelBlockIdEdit() {
  editingBlockId.value = null
  draftBlockId.value = ''
}

function commitBlockId(blockId: string) {
  if (draftBlockId.value.trim() && draftBlockId.value.trim() !== blockId) {
    editorStore.renameBlockId(blockId, draftBlockId.value)
  }
  cancelBlockIdEdit()
}
```

- [x] **Step 5: CSS**

Adicionar em `pages.css`:

```css
.web-page-tree__id,
.web-page-tree__id-input {
  min-width: 0;
  height: 20px;
  padding: 0 var(--sailor-space-1);
  border: 1px solid transparent;
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
  font-size: 10px;
}

.web-page-tree__id:hover,
.web-page-tree__id-input {
  border-color: var(--sailor-border);
  background: var(--sailor-bg-surface);
}
```

- [x] **Step 6: Rodar testes**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/utils/__tests__/blockTree.test.ts
npm exec tsx src/features/web-pages/stores/__tests__/page-editor.store.test.ts
npm exec tsx src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit**

```powershell
git add client-vue/src/features/web-pages/utils/blockTree.ts client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/stores/__tests__/page-editor.store.test.ts client-vue/src/features/web-pages/components/BlockTreePanel.vue client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: rename page element ids from tree"
```

## Task 4: Toolbar Hover/Focus No Canvas

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/PageEditor.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`

- [x] **Step 1: Contrato**

Adicionar teste:

```ts
it('canvas blocks expose ghost duplicate and delete actions', () => {
  const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
  const canvas = read('src/features/web-pages/components/PageCanvas.vue')
  const editor = read('src/features/web-pages/components/PageEditor.vue')

  assert.match(renderer, /BaseButton/)
  assert.match(renderer, /variant="ghost"/)
  assert.match(renderer, /duplicate-block/)
  assert.match(renderer, /delete-block/)
  assert.match(canvas, /@duplicate-block/)
  assert.match(editor, /duplicateBlockFromCanvas/)
  assert.match(editor, /deleteBlockFromCanvas/)
})
```

- [x] **Step 2: Refatorar BlockRenderer com frame seguro**

Usar wrapper para não colocar toolbar dentro de tags interativas:

```vue
<div class="web-page-block-frame" :class="{ 'web-page-block-frame--selected': selectedBlockId === block.id }">
  <div class="web-page-block-toolbar" @click.stop>
    <BaseButton variant="ghost" size="sm" icon-left="copy" @click="$emit('duplicate-block', block.id)">
      Duplicate
    </BaseButton>
    <BaseButton variant="ghost" size="sm" icon-left="trash-2" @click="$emit('delete-block', block.id)">
      Delete
    </BaseButton>
  </div>
  <component ...>
    ...
  </component>
</div>
```

- [x] **Step 3: Propagar eventos**

Em `PageCanvas.vue`:

```vue
@duplicate-block="$emit('duplicate-block', $event)"
@delete-block="$emit('delete-block', $event)"
```

Em `PageEditor.vue`:

```vue
@duplicate-block="duplicateBlockFromCanvas"
@delete-block="deleteBlockFromCanvas"
```

Funções:

```ts
function duplicateBlockFromCanvas(blockId: string) {
  editorStore.duplicateBlock(blockId)
}

function deleteBlockFromCanvas(blockId: string) {
  editorStore.deleteBlock(blockId)
}
```

- [x] **Step 4: CSS hover/focus suave**

Adicionar:

```css
.web-page-block-frame {
  position: relative;
}

.web-page-block-toolbar {
  position: absolute;
  top: -34px;
  right: 0;
  z-index: 5;
  display: flex;
  gap: var(--sailor-space-1);
  padding: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-sm);
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 140ms var(--sailor-ease-standard), transform 140ms var(--sailor-ease-standard);
}

.web-page-block-frame:hover > .web-page-block-toolbar,
.web-page-block-frame:focus-within > .web-page-block-toolbar,
.web-page-block-frame--selected > .web-page-block-toolbar {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
```

- [x] **Step 5: Rodar testes**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
npm run type-check
```

Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add client-vue/src/features/web-pages/components/BlockRenderer.vue client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/__tests__/PageEditor.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: add canvas block quick actions"
```

## Task 5: Delete Page Ao Lado Da Badge Da Page

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/PageChrome.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`

- [ ] **Step 1: Contrato**

Adicionar:

```ts
it('page badge exposes a direct delete button', () => {
  const source = read('src/features/web-pages/components/PageEditor.vue')

  assert.match(source, /web-page-editor__page-chip/)
  assert.match(source, /deletePageFromBadge/)
  assert.match(source, /icon-left="trash-2"/)
  assert.match(source, /variant="ghost"/)
})
```

- [ ] **Step 2: Trocar badge por chip com botão**

Em `PageEditor.vue`:

```vue
<div class="web-page-editor__page-chip">
  <button
    type="button"
    class="web-page-editor__page-handle"
    :class="{ 'web-page-editor__page-handle--active': page.id === pagesStore.activePage?.id }"
    @click="selectTreePage(page.id)"
  >
    {{ page.title }}
  </button>
  <BaseButton
    variant="ghost"
    size="icon"
    icon-left="trash-2"
    title="Delete page"
    @click="deletePageFromBadge(page.id)"
  />
</div>
```

Adicionar:

```ts
async function deletePageFromBadge(pageId: string) {
  await deletePageFromTree(pageId)
}
```

- [ ] **Step 3: CSS**

```css
.web-page-editor__page-chip {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--sailor-space-1);
  margin-bottom: var(--sailor-space-2);
}

.web-page-editor__page-chip .base-button {
  width: 28px;
  height: 28px;
}
```

- [ ] **Step 4: Rodar testes e commit**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/components/__tests__/PageChrome.contract.test.ts
npm run type-check
```

Commit:

```powershell
git add client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/__tests__/PageChrome.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: add direct page delete action"
```

## Task 6: Floating Toolbar Figma-like Para Adicionar Elementos

**Files:**
- Create: `client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockLibrary.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts`
- Create/Test: `client-vue/src/features/web-pages/components/__tests__/PageFloatingAddToolbar.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`

- [ ] **Step 1: Contrato da floating toolbar**

Criar `PageFloatingAddToolbar.contract.test.ts`:

```ts
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page floating add toolbar contract', () => {
  it('renders draggable element tools without click add behavior', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')

    assert.match(source, /draggable="true"/)
    assert.match(source, /onDragStart/)
    assert.match(source, /application\/x-sailor-page-block/)
    assert.doesNotMatch(source, /@click="\$emit\('add'/)
  })

  it('is mounted in the editor and old inspector library is removed', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /PageFloatingAddToolbar/)
    assert.doesNotMatch(editor, /<BlockLibrary/)
  })
})
```

- [ ] **Step 2: Criar componente**

`PageFloatingAddToolbar.vue`:

```vue
<template>
  <div class="web-page-floating-add-toolbar" aria-label="Add elements">
    <BaseButton
      v-for="tool in tools"
      :key="tool.tag"
      draggable="true"
      variant="ghost"
      size="icon"
      :icon-left="tool.icon"
      :title="tool.label"
      @dragstart="onDragStart($event, tool.tag)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlockTag } from '../types/page.types.ts'

const tools: Array<{ tag: PageBlockTag; icon: string; label: string }> = [
  { tag: 'header', icon: 'panel-top', label: 'Header' },
  { tag: 'section', icon: 'layout-template', label: 'Section' },
  { tag: 'div', icon: 'box', label: 'Div' },
  { tag: 'text', icon: 'type', label: 'Text' },
  { tag: 'button', icon: 'square-mouse-pointer', label: 'Button' },
  { tag: 'input', icon: 'text-cursor-input', label: 'Input' },
  { tag: 'form', icon: 'clipboard-list', label: 'Form' },
  { tag: 'image', icon: 'image', label: 'Image' },
  { tag: 'link', icon: 'link', label: 'Link' },
  { tag: 'footer', icon: 'panel-bottom', label: 'Footer' },
]

function onDragStart(event: DragEvent, tag: PageBlockTag) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ tag }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
</script>
```

- [ ] **Step 3: Montar no editor e remover antigo Inspector Library**

Em `PageEditor.vue`:

```vue
<PageFloatingAddToolbar />
```

Remover do Inspector:

```vue
<BlockLibrary @add="addBlock" />
```

Remover import `BlockLibrary`. Manter `addBlock` se ainda usado por chrome/futuro; se não usado, remover também.

- [ ] **Step 4: CSS**

```css
.web-page-floating-add-toolbar {
  position: fixed;
  top: 56px;
  left: 50%;
  z-index: 25;
  display: flex;
  gap: var(--sailor-space-1);
  padding: var(--sailor-space-1);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-lg);
  transform: translateX(-50%);
}
```

- [ ] **Step 5: Rodar testes e commit**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/components/__tests__/PageFloatingAddToolbar.contract.test.ts
npm run type-check
```

Commit:

```powershell
git add client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/__tests__/PageFloatingAddToolbar.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: add floating page element toolbar"
```

## Task 7: Indicadores Com Setas e Preview Bonito De Drag

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue`
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`

- [ ] **Step 1: Contrato**

Atualizar `PageDragPredict.contract.test.ts`:

```ts
it('drag prediction exposes directional arrow indicators and a custom drag preview', () => {
  const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
  const toolbar = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')
  const css = read('src/features/web-pages/pages.css')

  assert.match(renderer, /dropEdge/)
  assert.match(renderer, /web-page-drop-arrow/)
  assert.match(toolbar, /setDragImage/)
  assert.match(css, /web-page-drag-preview/)
  assert.match(css, /web-page-drop-arrow--top/)
  assert.match(css, /web-page-drop-arrow--right/)
  assert.match(css, /web-page-drop-arrow--bottom/)
  assert.match(css, /web-page-drop-arrow--left/)
})
```

- [ ] **Step 2: Estender intent sem quebrar position atual**

Em `page-editor.store.ts`:

```ts
export type DropEdge = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface PageDragIntent {
  targetId: string | 'root'
  position: InsertPosition
  dropEdge?: DropEdge
}
```

- [ ] **Step 3: BlockRenderer calcula edge e position**

```ts
function dropEdge(event: DragEvent): DropEdge {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  if (y < 0.22) return 'top'
  if (y > 0.78) return 'bottom'
  if (x < 0.22) return 'left'
  if (x > 0.78) return 'right'
  return 'center'
}

function dropPosition(event: DragEvent): InsertPosition {
  const edge = dropEdge(event)
  if (edge === 'top') return 'before'
  if (edge === 'bottom') return 'after'
  return isContainer.value ? 'inside' : 'after'
}
```

Em `onDragOver`:

```ts
emit('drag-intent', { targetId: props.block.id, position: dropPosition(event), dropEdge: dropEdge(event) })
```

- [ ] **Step 4: Renderizar setas minimalistas**

Em `BlockRenderer.vue`:

```vue
<span
  v-if="dropIntent?.targetId === block.id"
  class="web-page-drop-arrow"
  :class="`web-page-drop-arrow--${dropIntent.dropEdge ?? 'center'}`"
/>
```

- [ ] **Step 5: Drag preview custom**

Em `PageFloatingAddToolbar.vue`, `BlockTreePanel.vue` e `BlockRenderer.vue`, usar helper local simples:

```ts
function setDragPreview(event: DragEvent, label: string) {
  if (!event.dataTransfer) return
  const preview = document.createElement('div')
  preview.className = 'web-page-drag-preview'
  preview.textContent = label
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  window.setTimeout(() => preview.remove(), 0)
}
```

Chamar no `onDragStart`.

- [ ] **Step 6: CSS animação**

```css
.web-page-block-frame {
  transition: transform 160ms var(--sailor-ease-standard), box-shadow 160ms var(--sailor-ease-standard);
}

.web-page-block-frame:has(.web-page-block--drop-inside) {
  transform: translateY(-1px);
}

.web-page-drop-arrow {
  position: absolute;
  z-index: 4;
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--sailor-border-strong);
  border-left: 2px solid var(--sailor-border-strong);
  pointer-events: none;
}

.web-page-drop-arrow--top {
  top: -8px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.web-page-drop-arrow--right {
  top: 50%;
  right: -8px;
  transform: translateY(-50%) rotate(135deg);
}

.web-page-drop-arrow--bottom {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%) rotate(225deg);
}

.web-page-drop-arrow--left {
  top: 50%;
  left: -8px;
  transform: translateY(-50%) rotate(-45deg);
}

.web-page-drag-preview {
  position: fixed;
  top: -1000px;
  left: -1000px;
  z-index: -1;
  padding: var(--sailor-space-2) var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  box-shadow: var(--sailor-shadow-md);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-xs);
}
```

- [ ] **Step 7: Rodar testes e commit**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts
npm run type-check
```

Commit:

```powershell
git add client-vue/src/features/web-pages/components/BlockRenderer.vue client-vue/src/features/web-pages/components/BlockTreePanel.vue client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: polish page drag and drop feedback"
```

## Task 8: Tela De Seleção De Sites/Pages Em Grid Com Search e Modal

**Files:**
- Create: `client-vue/src/features/web-pages/components/PageCreateSiteModal.vue`
- Modify: `client-vue/src/features/web-pages/components/PagesList.vue`
- Modify/Test: `client-vue/src/features/web-pages/components/__tests__/PagesList.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`

- [ ] **Step 1: Contrato**

Atualizar `PagesList.contract.test.ts`:

```ts
it('renders pages as searchable grid cards and creates pages through BaseModal', () => {
  const list = fs.readFileSync(path.resolve('src/features/web-pages/components/PagesList.vue'), 'utf8')
  const modal = fs.readFileSync(path.resolve('src/features/web-pages/components/PageCreateSiteModal.vue'), 'utf8')

  assert.match(list, /searchQuery/)
  assert.match(list, /filteredPages/)
  assert.match(list, /web-pages-list__grid/)
  assert.match(list, /PageCreateSiteModal/)
  assert.match(list, /variant="primary"/)
  assert.match(modal, /BaseModal/)
  assert.match(modal, /BaseInput/)
  assert.match(modal, /create/)
})
```

- [ ] **Step 2: Criar modal**

`PageCreateSiteModal.vue`:

```vue
<template>
  <BaseModal :is-open="isOpen" max-width="520px" height="auto" @close="$emit('close')">
    <form class="web-page-create-modal" @submit.prevent="submit">
      <header class="web-page-create-modal__header">
        <h3>Create site</h3>
        <BaseButton variant="ghost" size="icon" icon-left="x" type="button" @click="$emit('close')" />
      </header>
      <div class="web-page-create-modal__body">
        <BaseInput v-model="title" label="Name" placeholder="Landing page" />
      </div>
      <footer class="web-page-create-modal__footer">
        <BaseButton variant="ghost" type="button" @click="$emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" icon-left="plus" :loading="loading" type="submit">Create</BaseButton>
      </footer>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'

const props = defineProps<{ isOpen: boolean; loading?: boolean }>()
const emit = defineEmits<{ close: []; create: [title: string] }>()
const title = ref('Untitled page')

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) title.value = 'Untitled page'
})

function submit() {
  emit('create', title.value.trim() || 'Untitled page')
}
</script>
```

- [ ] **Step 3: Refatorar PagesList**

Em `PagesList.vue`:

```ts
import { computed, onMounted, ref } from 'vue'
import PageCreateSiteModal from './PageCreateSiteModal.vue'

const searchQuery = ref('')
const isCreateModalOpen = ref(false)

const filteredPages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return pagesStore.pages
  return pagesStore.pages.filter((page) =>
    `${page.title} ${page.slug}`.toLowerCase().includes(query),
  )
})

async function createPage(pageTitle: string) {
  const page = await pagesStore.createPage({ title: pageTitle })
  isCreateModalOpen.value = false
  await router.push(`/pages/${page.id}`)
}
```

Template:

```vue
<section class="web-pages-list">
  <div class="web-pages-list__header">
    <BaseInput v-model="searchQuery" label="Search" placeholder="Search sites" />
    <BaseButton variant="primary" icon-left="plus" @click="isCreateModalOpen = true">
      New site
    </BaseButton>
  </div>

  <div class="web-pages-list__grid">
    <button v-for="page in filteredPages" :key="page.id" class="web-pages-list__card" type="button" @click="openPage(page.id)">
      ...
    </button>
  </div>

  <PageCreateSiteModal
    :is-open="isCreateModalOpen"
    :loading="pagesStore.isSaving"
    @close="isCreateModalOpen = false"
    @create="createPage"
  />
</section>
```

- [ ] **Step 4: CSS grid**

```css
.web-pages-list {
  min-height: 100%;
  padding: var(--sailor-space-6);
  background: var(--sailor-bg-base);
}

.web-pages-list__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--sailor-space-3);
  max-width: 1120px;
  margin: 0 auto var(--sailor-space-4);
}

.web-pages-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--sailor-space-3);
  max-width: 1120px;
  margin: 0 auto;
}

.web-pages-list__card {
  display: grid;
  gap: var(--sailor-space-3);
  min-height: 140px;
  padding: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  text-align: left;
}
```

- [ ] **Step 5: Rodar testes e commit**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/components/__tests__/PagesList.contract.test.ts
npm run type-check
```

Commit:

```powershell
git add client-vue/src/features/web-pages/components/PageCreateSiteModal.vue client-vue/src/features/web-pages/components/PagesList.vue client-vue/src/features/web-pages/components/__tests__/PagesList.contract.test.ts client-vue/src/features/web-pages/pages.css feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "feat: redesign pages selection grid"
```

## Task 9: QA Visual e Build Final

**Files:**
- Modify: `feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md`

- [ ] **Step 1: Rodar contratos da feature**

Run:

```powershell
cd client-vue
npm exec tsx src/features/web-pages/utils/__tests__/blockTree.test.ts
npm exec tsx src/features/web-pages/stores/__tests__/page-editor.store.test.ts
npm exec tsx src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PageChrome.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PageFloatingAddToolbar.contract.test.ts
npm exec tsx src/features/web-pages/components/__tests__/PagesList.contract.test.ts
```

Expected: PASS.

- [ ] **Step 2: Rodar type-check e build**

Run:

```powershell
cd client-vue
npm run type-check
npm run build-only
```

Expected: PASS.

- [ ] **Step 3: Teste manual no navegador**

Run:

```powershell
cd client-vue
npm run dev
```

Manual:

- Abrir `/pages`.
- Ver grid, search, botão `New site`, modal com `BaseModal`.
- Criar site e abrir editor.
- Arrastar elemento da floating toolbar para canvas vazio.
- Arrastar elemento para dentro de `section`, `div`, `header`, `footer`, `form`.
- Arrastar elemento pela Tree para dentro de outro container.
- Confirmar setas top/right/bottom/left durante drag.
- Confirmar preview visual custom durante drag.
- Duplo clique no ID na Tree, renomear, Enter salva.
- Tentar ID duplicado; deve recusar sem quebrar seleção.
- Hover/focus em elemento no Canvas mostra toolbar Duplicate/Delete.
- Delete ao lado da badge da Page remove a page correta.

- [ ] **Step 4: Atualizar plano como completo**

Marcar tasks concluídas neste arquivo.

- [ ] **Step 5: Commit final do checklist**

```powershell
git add feats-map/sailor-pages-floating-toolbar-dnd-sites-grid.md
git commit -m "docs: complete sailor pages toolbar dnd checklist"
```

## Riscos e Decisões

- Nested drag/drop é a parte mais sensível. Prioridade: preservar `InsertPosition = before | inside | after` e adicionar setas como visual, sem mudar modelo de dados para left/right.
- `BlockRenderer` atual renderiza tags reais, inclusive `button`. A toolbar precisa ficar fora da tag renderizada para evitar botão dentro de botão.
- Rename de ID deve recusar duplicado. Não fazer auto-merge nem auto-suffix, porque ID é referência interna.
- Remover `BlockLibrary` do Inspector só depois da floating toolbar estar funcional.
- Tela `/pages` deixa de usar `AppPanel` fixo para virar grid full page. Isso combina melhor com seleção de Sites.
