<template>
  <div class="base-canvas-rulers" aria-hidden="true">
    <canvas
      ref="topCanvasRef"
      class="base-canvas-rulers__top"
      data-base-canvas-ruler-axis="x"
    />
    <canvas
      ref="leftCanvasRef"
      class="base-canvas-rulers__left"
      data-base-canvas-ruler-axis="y"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BaseCanvasViewport } from './types.ts'
import { getRulerTicks } from './rulers.ts'

const props = withDefaults(defineProps<{
  viewport: BaseCanvasViewport
  gridSize?: number
  rulerSize?: number
}>(), {
  gridSize: 16,
  rulerSize: 24,
})

const topCanvasRef = ref<HTMLCanvasElement | null>(null)
const leftCanvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  window.addEventListener('resize', drawRulers)
  void nextTick(drawRulers)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', drawRulers)
})

watch(
  () => [props.viewport.x, props.viewport.y, props.viewport.zoom, props.gridSize, props.rulerSize],
  () => drawRulers(),
)

function drawRulers() {
  drawAxis(topCanvasRef.value, 'x')
  drawAxis(leftCanvasRef.value, 'y')
}

function drawAxis(canvas: HTMLCanvasElement | null, axis: 'x' | 'y') {
  const parent = canvas?.parentElement
  if (!canvas || !parent) return
  const width = axis === 'x' ? parent.clientWidth : props.rulerSize
  const height = axis === 'x' ? props.rulerSize : parent.clientHeight
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)
  context.fillStyle = 'rgba(17, 17, 17, 0.86)'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  context.fillStyle = 'rgba(255, 255, 255, 0.54)'
  context.font = '10px sans-serif'

  const length = axis === 'x' ? width : height
  for (const tick of getRulerTicks({ axis, viewport: props.viewport, length, gridSize: props.gridSize })) {
    context.beginPath()
    if (axis === 'x') {
      context.moveTo(tick.position, props.rulerSize)
      context.lineTo(tick.position, tick.major ? 8 : 15)
      if (tick.label) context.fillText(tick.label, tick.position + 3, 10)
    } else {
      context.moveTo(props.rulerSize, tick.position)
      context.lineTo(tick.major ? 8 : 15, tick.position)
      if (tick.label) context.fillText(tick.label, 2, tick.position - 3)
    }
    context.stroke()
  }
}
</script>

<style scoped>
.base-canvas-rulers {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.base-canvas-rulers__top,
.base-canvas-rulers__left {
  position: absolute;
  display: block;
}

.base-canvas-rulers__top {
  top: 0;
  left: 0;
  width: 100%;
  height: 24px;
}

.base-canvas-rulers__left {
  top: 0;
  left: 0;
  width: 24px;
  height: 100%;
}
</style>
