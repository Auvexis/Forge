<template>
  <div
    class="web-page-blueprint-component-group"
    :class="{ 'is-selected': selected }"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      height: `${height}px`,
      '--blueprint-group-color': color,
    }"
  >
    <div class="web-page-blueprint-component-group__title" data-base-canvas-no-drag @dblclick.stop="startNameEdit">
      <input
        v-if="editingName"
        ref="nameInputRef"
        v-model="draftName"
        @keydown.enter.prevent="commitNameEdit"
        @keydown.esc.prevent="cancelNameEdit"
        @blur="commitNameEdit"
        @pointerdown.stop
      />
      <strong v-else>{{ name }}</strong>
    </div>
    <header data-base-canvas-no-drag @pointerdown.stop.prevent="$emit('dragStart', $event)">
      <span class="web-page-blueprint-component-group__accent" />
      <LucideIcon :name="kind === 'group' ? 'group' : 'component'" :size="12" />
      <strong>{{ kind }}</strong>
      <small>{{ childCount }} nodes</small>
      <div v-if="kind === 'group'" class="web-page-blueprint-component-group__colors" @pointerdown.stop>
        <button
          v-for="preset in colorPresets"
          :key="preset"
          type="button"
          :class="{ 'is-active': preset === color }"
          :style="{ background: preset }"
          :title="preset"
          @click.stop="$emit('updateColor', preset)"
        />
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = withDefaults(defineProps<{
  id: string
  name: string
  kind?: 'group' | 'component'
  color?: string
  childCount: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>(), {
  kind: 'component',
  color: 'var(--fabric-base-component-group-accent)',
})

const emit = defineEmits<{
  dragStart: [event: PointerEvent]
  rename: [name: string]
  updateColor: [color: string]
}>()

const colorPresets = ['#5b8def', '#8b6fd6', '#4f9b8f', '#c27b48', '#d65f7f', '#d4a72c', '#40a6d9', '#8aa05a']
const editingName = ref(false)
const draftName = ref(props.name)
const nameInputRef = ref<HTMLInputElement | null>(null)

async function startNameEdit() {
  draftName.value = props.name
  editingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

function commitNameEdit() {
  if (!editingName.value) return
  editingName.value = false
  emit('rename', draftName.value)
}

function cancelNameEdit() {
  editingName.value = false
  draftName.value = props.name
}
</script>
