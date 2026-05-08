<script setup lang="ts">
import { ref, computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  data: any
  name?: string
  path?: string
  isRoot?: boolean
  isLast?: boolean
  icons?: Record<string, string>
}>()

const isObject = computed(
  () => props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data),
)
const isArray = computed(() => Array.isArray(props.data))
const isExpanded = ref(true)

function toggle() {
  isExpanded.value = !isExpanded.value
}

// Para Drag & Drop
const onDragStart = (event: DragEvent) => {
  if (props.path) {
    event.dataTransfer?.setData('text/plain', `{{ ${props.path} }}`)
  }
}
</script>

<template>
  <div class="json-node" :class="{ 'json-node--root': isRoot }">
    <div class="json-line flex items-start">
      <div v-if="isObject || isArray" class="json-toggle-btn" @click="toggle">
        <LucideIcon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
      </div>
      <div v-else style="width: 20px; height: 20px; margin-right: 4px"></div>

      <span
        v-if="name"
        class="json-key font-mono text-sm transition-all"
        style="display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap;"
        :class="path ? 'json-key-draggable' : 'mr-1'"
        :draggable="!!path"
        @dragstart="onDragStart"
        :title="path ? 'Drag to map' : ''"
      >
        <template v-if="icons && path && icons[path]">
          <img v-if="icons[path]!.startsWith('http') || icons[path]!.startsWith('/') || icons[path]!.startsWith('data:')" :src="icons[path]" style="width: 14px; height: 14px; flex-shrink: 0; object-fit: contain; border-radius: 2px;" />
          <LucideIcon v-else :name="icons[path]!" :size="14" style="flex-shrink: 0;" />
        </template>
        <LucideIcon v-else-if="path" name="tag" :size="12" style="flex-shrink: 0; opacity: 0.5;" />
        
        <span class="json-key-text">"{{ name }}"</span>
      </span>
      <span v-if="name" class="json-punctuation text-muted mr-1">:</span>

      <!-- Values -->
      <template v-if="isObject">
        <span class="json-punctuation text-muted cursor-pointer" @click="toggle">{</span>
        <span v-if="!isExpanded" class="json-punctuation text-muted cursor-pointer" @click="toggle">
          ... }<span v-if="!isLast">,</span></span
        >
      </template>
      <template v-else-if="isArray">
        <span class="json-punctuation text-muted cursor-pointer" @click="toggle">[</span>
        <span v-if="!isExpanded" class="json-punctuation text-muted cursor-pointer" @click="toggle">
          ... ]<span v-if="!isLast">,</span></span
        >
      </template>

      <!-- Primitives -->
      <template v-else>
        <span class="json-value-wrap">
          <span v-if="typeof data === 'string'" class="json-string font-mono text-sm"
            >"{{ data }}"</span
          >
          <span v-else-if="typeof data === 'number'" class="json-number font-mono text-sm">{{ data }}</span>
          <span v-else-if="typeof data === 'boolean'" class="json-boolean font-mono text-sm">{{ data }}</span>
          <span v-else-if="data === null" class="json-punctuation font-mono text-sm">null</span>
          <span v-if="!isLast" class="json-punctuation text-muted">,</span>
        </span>
      </template>
    </div>

    <!-- Children -->
    <div v-if="(isObject || isArray) && isExpanded" class="json-children">
      <template v-if="isObject">
        <JsonTreeView
          v-for="(val, key, index) in data"
          :key="key"
          :data="val"
          :name="String(key)"
          :path="path ? `${path}.${String(key)}` : String(key)"
          :is-last="index === Object.keys(data).length - 1"
          :icons="icons"
        />
      </template>
      <template v-if="isArray">
        <JsonTreeView
          v-for="(val, index) in data"
          :key="index"
          :data="val"
          :path="path ? `${path}[${index}]` : `[${index}]`"
          :is-last="index === data.length - 1"
          :icons="icons"
        />
      </template>
    </div>

    <div v-if="(isObject || isArray) && isExpanded" class="json-line flex">
      <span class="w-4 mr-1"></span>
      <span class="json-punctuation text-muted">
        {{ isObject ? '}' : ']' }}<span v-if="!isLast">,</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.json-node {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  line-height: 1.5;
  min-width: 0;
}
.json-node--root {
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 2px;
}
.json-line {
  min-width: 0;
  max-width: 100%;
  flex-wrap: nowrap;
}
.json-value-wrap {
  /* Takes remaining space after the key, allows long values to wrap here only */
  flex: 1;
  min-width: 0;
  display: inline;
}
.json-children {
  margin-left: 12px;
  padding-left: 8px;
  border-left: 1px solid var(--nod8-border);
}
.json-toggle-btn {
  width: 20px;
  height: 20px;
  margin-top: 1px;
  margin-right: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-muted);
  transition: all 0.15s ease;
  user-select: none;
}
.json-toggle-btn:hover {
  color: var(--nod8-button-ghost-hover-text);
  background-color: var(--nod8-button-ghost-hover);
}
.json-key {
  color: var(--json-color-key, var(--nod8-text-primary));
  min-width: 0;
  flex-shrink: 0;
}
.json-key-text {
  /* Key label never wraps — white-space:nowrap inherited from parent span */
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.json-key-draggable {
  margin-right: 4px;
  padding: 2px 6px;
  margin-left: -6px;
  border-radius: 4px;
  cursor: grab;
}
.json-key-draggable:hover {
  color: var(--nod8-button-ghost-hover-text);
  background-color: var(--nod8-button-ghost-hover);
}
.json-key-draggable:active {
  cursor: grabbing;
  transform: scale(0.97);
}
.json-string {
  color: var(--json-color-string, rgb(34, 197, 94));
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.json-number {
  color: var(--json-color-number, rgb(234, 179, 8));
}
.json-boolean {
  color: var(--json-color-boolean, rgb(239, 68, 68));
}
.json-punctuation {
  color: var(--json-color-punctuation, var(--nod8-text-muted));
}
.draggable-item {
  cursor: grab;
}
.draggable-item:active {
  cursor: grabbing;
}
</style>
