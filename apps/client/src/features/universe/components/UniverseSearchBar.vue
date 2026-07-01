<template>
  <div class="usearch" :class="{ 'usearch--open': isOpen && filteredNodes.length > 0 }">
    <div class="usearch__input-wrap">
      <svg class="usearch__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        class="usearch__input"
        type="search"
        placeholder="Search plugins..."
        autocomplete="off"
        spellcheck="false"
        @focus="isOpen = true"
        @blur="onBlur"
        @keydown.escape="close"
        @keydown.enter="selectHighlighted"
        @keydown.arrow-down.prevent="moveHighlight(1)"
        @keydown.arrow-up.prevent="moveHighlight(-1)"
      />
      <kbd v-if="!query" class="usearch__kbd">/</kbd>
      <button v-if="query" class="usearch__clear" @click="clearQuery" tabindex="-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <Transition name="usearch-drop">
      <ul v-if="isOpen && filteredNodes.length > 0" class="usearch__dropdown" role="listbox" @mousedown.prevent>
        <li
          v-for="(node, idx) in filteredNodes"
          :key="node.id"
          class="usearch__item"
          :class="{ 'usearch__item--hi': idx === highlightIndex }"
          role="option"
          @mouseenter="highlightIndex = idx"
          @click="selectNode(node)"
        >
          <div class="usearch__item-icon" :style="{ '--nc': node.color }">
            <UniversePluginIcon :icon="node.icon" :fallback="node.plugin.manifest.metadata.style?.icon" :size="18" />
          </div>
          <div class="usearch__item-body">
            <div class="usearch__item-row">
              <span class="usearch__item-name">{{ node.label }}</span>
              <span class="usearch__item-cat">{{ node.category }}</span>
            </div>
            <p class="usearch__item-desc">{{ node.description }}</p>
          </div>
          <div class="usearch__dot" :class="`usearch__dot--${node.status}`" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { UniversePluginNode } from '../types/universe.types'
import UniversePluginIcon from './UniversePluginIcon.vue'

const props = defineProps<{ nodes: UniversePluginNode[] }>()
const emit = defineEmits<{ select: [nodeId: string] }>()

const query          = ref('')
const isOpen         = ref(false)
const highlightIndex = ref(0)
const inputRef       = ref<HTMLInputElement | null>(null)

const filteredNodes = computed(() => {
  const q = query.value.trim().toLowerCase()
  const source = q ? props.nodes.filter(n =>
    n.label.toLowerCase().includes(q) ||
    n.description.toLowerCase().includes(q) ||
    n.category.toLowerCase().includes(q),
  ) : props.nodes
  return source.slice(0, 10)
})

function onBlur()  { setTimeout(() => { isOpen.value = false }, 150) }
function close()   { isOpen.value = false; inputRef.value?.blur() }
function clearQuery() { query.value = ''; inputRef.value?.focus() }
function moveHighlight(dir: 1 | -1) {
  const len = filteredNodes.value.length
  if (!len) return
  highlightIndex.value = (highlightIndex.value + dir + len) % len
}
function selectHighlighted() {
  const node = filteredNodes.value[highlightIndex.value]
  if (node) selectNode(node)
}
function selectNode(node: UniversePluginNode) {
  emit('select', node.id)
  query.value = ''
  close()
}

function onGlobalKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault()
    inputRef.value?.focus()
    isOpen.value = true
  }
}
onMounted(()        => document.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(()  => document.removeEventListener('keydown', onGlobalKey))
</script>

<style scoped>
.usearch { position: relative; width: 420px; max-width: 90vw; }

.usearch__input-wrap {
  display: flex; align-items: center; gap: 8px; padding: 0 12px; height: 40px;
  background: rgba(8,10,20,0.82); border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px; backdrop-filter: blur(18px);
  transition: border-color .18s, box-shadow .18s;
}
.usearch:focus-within .usearch__input-wrap,
.usearch--open .usearch__input-wrap {
  border-color: rgba(136,187,255,.35);
  box-shadow: 0 0 0 3px rgba(136,187,255,.08), 0 4px 24px rgba(0,0,0,.5);
}
.usearch__icon { width:15px; height:15px; flex-shrink:0; color:rgba(255,255,255,.35); }
.usearch__input {
  flex:1; background:none; border:none; outline:none;
  color:rgba(255,255,255,.92); font-size:13px; font-family:inherit;
}
.usearch__input::placeholder { color:rgba(255,255,255,.28); }
.usearch__input::-webkit-search-cancel-button { display:none; }
.usearch__kbd {
  flex-shrink:0; padding:2px 7px; border-radius:4px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10);
  color:rgba(255,255,255,.30); font-size:11px; font-family:inherit; pointer-events:none;
}
.usearch__clear {
  width:16px; height:16px; flex-shrink:0; background:none; border:none;
  cursor:pointer; color:rgba(255,255,255,.35); padding:0; display:flex; align-items:center;
}
.usearch__clear svg { width:14px; height:14px; }
.usearch__clear:hover { color:rgba(255,255,255,.7); }

.usearch__dropdown {
  position:absolute; top:calc(100% + 6px); left:0; right:0;
  background:rgba(6,8,18,.94); border:1px solid rgba(255,255,255,.09);
  border-radius:12px; backdrop-filter:blur(24px);
  box-shadow:0 20px 60px rgba(0,0,0,.7); list-style:none; margin:0; padding:4px;
  z-index:100; max-height:420px; overflow-y:auto;
}
.usearch__dropdown::-webkit-scrollbar { width:4px; }
.usearch__dropdown::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:4px; }

.usearch__item {
  display:flex; align-items:center; gap:10px; padding:8px 10px;
  border-radius:8px; cursor:pointer; transition:background .1s;
}
.usearch__item--hi { background:rgba(255,255,255,.06); }

.usearch__item-icon {
  width:32px; height:32px; flex-shrink:0; display:flex; align-items:center;
  justify-content:center; border-radius:8px;
  padding:6px;
  background:color-mix(in srgb, var(--nc,#88bbff) 14%, transparent);
  border:1px solid color-mix(in srgb, var(--nc,#88bbff) 22%, transparent);
  color:var(--nc,#88bbff);
  contain:paint;
  overflow:hidden;
}
.usearch__item-icon :deep(img) {
  width:100%;
  height:100%;
  object-fit:contain;
}
.usearch__item-body { flex:1; min-width:0; }
.usearch__item-row  { display:flex; align-items:baseline; gap:6px; margin-bottom:2px; }
.usearch__item-name { font-size:13px; font-weight:500; color:rgba(255,255,255,.90); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.usearch__item-cat  { font-size:10px; color:rgba(255,255,255,.30); white-space:nowrap; flex-shrink:0; }
.usearch__item-desc { font-size:11px; color:rgba(255,255,255,.40); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.usearch__dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.usearch__dot--connected    { background:#22c55e; box-shadow:0 0 5px #22c55e88; }
.usearch__dot--configured   { background:#eab308; }
.usearch__dot--not_configured { background:rgba(255,255,255,.18); }
.usearch__dot--error        { background:#ef4444; }

.usearch-drop-enter-active, .usearch-drop-leave-active { transition:opacity .15s, transform .15s; }
.usearch-drop-enter-from, .usearch-drop-leave-to { opacity:0; transform:translateY(-6px); }
</style>
