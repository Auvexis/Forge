<template>
  <div
    class="web-page-blueprint-element-group"
    :class="{ 'is-selected': selected }"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      height: `${height}px`,
    }"
  >
    <header data-base-canvas-no-drag @pointerdown.stop.prevent="$emit('dragStart', $event)">
      <span class="web-page-blueprint-element-group__accent" :style="{ background: color }" />
      <LucideIcon :name="icon" :size="12" />
      <strong>{{ label }}</strong>
      <small>{{ childCount }} children</small>
      <button
        type="button"
        :title="collapsed ? 'Show preview' : 'Hide preview'"
        @pointerdown.stop
        @click.stop="$emit('toggle')"
      >
        <LucideIcon :name="collapsed ? 'panel-top-open' : 'panel-top-close'" :size="12" />
      </button>
    </header>

    <div v-if="!collapsed" class="web-page-blueprint-element-group__preview" data-base-canvas-no-drag>
      <div class="web-page-blueprint-element-group__preview-stage">
        <BaseElementPreview :block="block" />
      </div>
      <footer>
        <span>{{ tag }}</span>
        <strong>{{ preview }}</strong>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock } from '../../types/page.types.ts'
import BaseElementPreview from './BaseElementPreview.vue'

defineProps<{
  block: PageBlock
  label: string
  tag: string
  icon: string
  preview: string
  childCount: number
  color: string
  x: number
  y: number
  width: number
  height: number
  collapsed: boolean
  selected: boolean
}>()

defineEmits<{
  toggle: []
  dragStart: [event: PointerEvent]
}>()
</script>
