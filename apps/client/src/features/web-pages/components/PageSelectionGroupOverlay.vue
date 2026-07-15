<template>
  <Teleport to="body">
    <div
      v-if="selectedBlockIds.length > 1 && frameStyle"
      class="web-page-block-selection web-page-block-selection--group"
      :style="frameStyle"
    >
      <div class="web-page-block-selection__chrome">
        <span class="web-page-block-selection__id">{{ selectedBlockIds.length }} elements</span>
        <div class="web-page-block-selection__actions" @pointerdown.stop.prevent @mousedown.stop.prevent @click.stop>
          <BaseButton
            variant="ghost"
            size="icon"
            icon-left="settings-2"
            title="Inspect selection"
            @click="$emit('inspect')"
          />
          <BaseButton
            variant="ghost"
            size="icon"
            icon-left="copy"
            title="Duplicate selected elements"
            @click="$emit('duplicate')"
          />
          <BaseButton
            variant="ghost"
            size="icon"
            icon-left="trash-2"
            title="Delete selected elements"
            @click="$emit('delete')"
          />
        </div>
      </div>
      <button
        v-for="corner in corners"
        :key="corner"
        type="button"
        class="web-page-block-resize__handle"
        :class="`web-page-block-resize__handle--${corner}`"
        :aria-label="`Group resize from ${corner}`"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = defineProps<{
  selectedBlockIds: string[]
  viewportKey?: string
}>()

defineEmits<{
  inspect: []
  duplicate: []
  delete: []
}>()

const frameStyle = ref<Record<string, string> | null>(null)
const corners = ['north-west', 'north-east', 'south-west', 'south-east']
let frameRaf = 0
let lastFrameKey = ''

onMounted(() => {
  updateGroupFrame()
  updateGroupFrameTracking()
  window.addEventListener('resize', updateGroupFrame)
  window.addEventListener('scroll', updateGroupFrame, true)
})

onBeforeUnmount(() => {
  stopGroupFrameTracking()
  window.removeEventListener('resize', updateGroupFrame)
  window.removeEventListener('scroll', updateGroupFrame, true)
})

watch(
  () => [props.selectedBlockIds.join(','), props.viewportKey],
  () => {
    updateGroupFrameTracking()
    void nextTick(updateGroupFrame)
  },
)

function updateGroupFrame() {
  if (props.selectedBlockIds.length < 2) {
    frameStyle.value = null
    lastFrameKey = ''
    return
  }

  const rects = props.selectedBlockIds
    .map((blockId) => document.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(blockId)}"]`))
    .filter((element): element is HTMLElement => !!element)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)

  if (!rects.length) {
    frameStyle.value = null
    return
  }

  const left = Math.min(...rects.map((rect) => rect.left))
  const top = Math.min(...rects.map((rect) => rect.top))
  const right = Math.max(...rects.map((rect) => rect.right))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  const nextKey = `${left}:${top}:${right}:${bottom}`
  if (nextKey === lastFrameKey) return
  lastFrameKey = nextKey

  frameStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${right - left}px`,
    height: `${bottom - top}px`,
    position: 'fixed',
  }
}

function updateGroupFrameTracking() {
  if (props.selectedBlockIds.length > 1) {
    startGroupFrameTracking()
    return
  }
  stopGroupFrameTracking()
}

function startGroupFrameTracking() {
  if (frameRaf) return
  const tick = () => {
    updateGroupFrame()
    frameRaf = props.selectedBlockIds.length > 1 ? window.requestAnimationFrame(tick) : 0
  }
  frameRaf = window.requestAnimationFrame(tick)
}

function stopGroupFrameTracking() {
  if (!frameRaf) return
  window.cancelAnimationFrame(frameRaf)
  frameRaf = 0
}
</script>
