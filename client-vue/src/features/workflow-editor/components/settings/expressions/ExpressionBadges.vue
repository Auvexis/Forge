<script setup lang="ts">
import { computed } from 'vue'
import { findExpressionTokens } from './expressionVariables'

const props = defineProps<{
  value?: string | number | boolean | null
}>()

const tokens = computed(() => findExpressionTokens(String(props.value ?? '')))
</script>

<template>
  <div v-if="tokens.length" class="expression-badges" aria-label="Inserted variables">
    <span
      v-for="token in tokens"
      :key="`${token.scope}:${token.name}`"
      class="expression-badge"
      :class="`expression-badge--${token.scope}`"
      :title="token.token"
    >
      <span class="expression-badge__scope">{{ token.scope === 'local' ? 'Local' : 'Global' }}</span>
      <span class="expression-badge__name">{{ token.name }}</span>
    </span>
  </div>
</template>

<style scoped>
.expression-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.expression-badge {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border-radius: var(--sailor-radius-full);
  border: 1px solid transparent;
  font-size: 10px;
  font-weight: var(--sailor-font-medium);
  line-height: 18px;
}

.expression-badge--local {
  background: rgba(168, 85, 247, 0.14);
  border-color: rgba(168, 85, 247, 0.35);
  color: rgb(216, 180, 254);
}

.expression-badge--global {
  background: rgba(6, 182, 212, 0.14);
  border-color: rgba(6, 182, 212, 0.35);
  color: rgb(103, 232, 249);
}

.expression-badge__scope {
  flex-shrink: 0;
  padding: 0 6px;
  border-right: 1px solid currentColor;
  opacity: 0.8;
}

.expression-badge__name {
  min-width: 0;
  overflow: hidden;
  padding: 0 7px;
  font-family: var(--sailor-font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
