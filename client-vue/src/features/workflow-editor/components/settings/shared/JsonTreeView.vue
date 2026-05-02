<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  data: any
  name?: string
  path?: string
  isRoot?: boolean
  isLast?: boolean
}>()

const isObject = computed(() => props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data))
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
  <div class="json-node" :class="{ 'ml-4': !isRoot }">
    <div class="json-line flex items-start">
      <span v-if="isObject || isArray" class="cursor-pointer select-none w-4 text-center mr-1 text-muted hover:text-primary" @click="toggle">
        {{ isExpanded ? '▾' : '▸' }}
      </span>
      <span v-else class="w-4 mr-1"></span>

      <!-- Key -->
      <span 
        v-if="name" 
        class="json-key mr-1 font-mono text-sm" 
        :class="{ 'draggable-item hover:text-primary hover:underline': path }"
        :draggable="!!path"
        @dragstart="onDragStart"
      >
        "{{ name }}"
      </span>
      <span v-if="name" class="json-punctuation text-muted mr-1">:</span>

      <!-- Values -->
      <template v-if="isObject">
        <span class="json-punctuation text-muted cursor-pointer" @click="toggle">{</span>
        <span v-if="!isExpanded" class="json-punctuation text-muted cursor-pointer" @click="toggle"> ... }<span v-if="!isLast">,</span></span>
      </template>
      <template v-else-if="isArray">
        <span class="json-punctuation text-muted cursor-pointer" @click="toggle">[</span>
        <span v-if="!isExpanded" class="json-punctuation text-muted cursor-pointer" @click="toggle"> ... ]<span v-if="!isLast">,</span></span>
      </template>
      
      <!-- Primitives -->
      <template v-else>
        <span v-if="typeof data === 'string'" class="json-string font-mono text-sm">"{{ data }}"</span>
        <span v-else-if="typeof data === 'number'" class="json-number font-mono text-sm">{{ data }}</span>
        <span v-else-if="typeof data === 'boolean'" class="json-boolean font-mono text-sm">{{ data }}</span>
        <span v-else-if="data === null" class="json-punctuation font-mono text-sm">null</span>
        <span v-if="!isLast" class="json-punctuation text-muted">,</span>
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
        />
      </template>
      <template v-if="isArray">
        <JsonTreeView 
          v-for="(val, index) in data" 
          :key="index" 
          :data="val"
          :path="path ? `${path}[${index}]` : `[${index}]`"
          :is-last="index === data.length - 1"
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  line-height: 1.5;
}
.json-key {
  color: var(--json-color-key, var(--nod8-text-primary));
}
.json-string {
  color: var(--json-color-string, rgb(34, 197, 94));
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
