<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useEventBus } from '@/shared/composables/useEventBus'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  nodeId: string
  handleId: string
}>()

const { edges } = useVueFlow()
const quickAddBus = useEventBus('node:quick-add')

const hasConnection = computed(() =>
  edges.value.some((e) => e.source === props.nodeId && e.sourceHandle === props.handleId),
)

const onQuickAdd = () => {
  quickAddBus.emit({ sourceId: props.nodeId, sourceHandle: props.handleId })
}
</script>

<template>
  <div
    v-if="!hasConnection"
    class="qab-wrap"
    title="Add connected node"
    @click.stop="onQuickAdd"
  >
    <div class="qab-cable"></div>
    <button class="qab-btn">
      <LucideIcon name="plus" :size="11" />
    </button>
  </div>
</template>

<style scoped>
.qab-wrap {
  position: absolute;
  right: -82px;
  display: flex;
  align-items: center;
  z-index: 5;
  transform: translateY(-50%);
  cursor: pointer;
}

.qab-cable {
  width: 60px;
  height: 2px;
  background-color: var(--nod8-node-handle);
  transition: background-color 0.2s;
}

.qab-btn {
  border-radius: var(--nod8-radius-sm);
  background-color: var(--nod8-node-border);
  border: 2px solid var(--nod8-border-strong);
  color: var(--nod8-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 19px;
  height: 19px;
  transition: all 0.2s;
}

.qab-btn:hover {
  background-color: var(--nod8-accent);
  border-color: var(--nod8-accent);
  color: #fff;
}
</style>
