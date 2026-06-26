<script setup lang="ts">
import BaseNode from './BaseNode.vue'
import type {
  BaseNodeHandlerDefinition,
  NodeBorderStyle,
  NodeRounding,
  NodeSide,
} from './nodePresentation.types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  id?: string
  title: string
  description?: string
  iconLeft?: string
  handlers?: BaseNodeHandlerDefinition[]
  autoOrganize?: boolean
  inputPosition?: NodeSide
  outputPosition?: NodeSide
  rounded?: NodeRounding
  borderStyle?: NodeBorderStyle
  width?: number | string
  height?: number | string
}>(), {
  handlers: () => [],
  autoOrganize: false,
  inputPosition: 'left',
  outputPosition: 'right',
  rounded: 'md',
  borderStyle: 'default',
  width: '236px',
  height: '100px',
})
</script>

<template>
  <div
    class="sailor-base-advanced-node sailor-node-pop-in"
    :data-auto-organize="props.autoOrganize ? 'true' : undefined"
  >
    <BaseNode
      v-bind="$attrs"
      :id="props.id"
      :handlers="props.handlers"
      :input-position="props.inputPosition"
      :output-position="props.outputPosition"
      :rounded="props.rounded"
      :border-style="props.borderStyle"
      :width="props.width"
      :height="props.height"
    >
      <template #icon>
        <div class="sailor-base-advanced-node__content">
          <div class="sailor-base-advanced-node__icon">
            <slot name="icon-left" />
          </div>
          <div class="sailor-base-advanced-node__copy">
            <span class="sailor-base-advanced-node__title" :title="props.title">
              {{ props.title }}
            </span>
            <span v-if="props.description" class="sailor-base-advanced-node__description">
              {{ props.description }}
            </span>
          </div>
        </div>
      </template>

      <slot />

      <template v-if="$slots.label" #label>
        <slot name="label" />
      </template>
    </BaseNode>
  </div>
</template>

<style scoped>
.sailor-base-advanced-node {
  position: relative;
  user-select: none;
}

.sailor-base-advanced-node :deep(.sailor-base-node.sailor-node-pop-in) {
  animation: none;
}

.sailor-base-advanced-node__content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  box-sizing: border-box;
  padding: 0 28px;
}

.sailor-base-advanced-node__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  flex: 0 0 auto;
}

.sailor-base-advanced-node__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.sailor-base-advanced-node__title,
.sailor-base-advanced-node__description {
  max-width: 160px;
  overflow: hidden;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sailor-base-advanced-node__title {
  color: var(--sailor-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.sailor-base-advanced-node__description {
  color: var(--sailor-text-muted);
  font-size: 11px;
}
</style>
