<template>
  <div class="code-block surface">
    <div class="code-block__header">
      <span class="code-block__lang">{{ language }}</span>
      <button class="code-block__copy" @click="copy" title="Copy Code">
        <LucideIcon :name="copied ? 'check' : 'copy'" :size="14" />
      </button>
    </div>
    <div class="code-block__body">
      <pre><code>{{ code }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useToast } from '@/shared/composables/useToast'

const props = withDefaults(
  defineProps<{
    code: string
    language?: string
  }>(),
  {
    language: 'javascript',
  },
)

const { success, error } = useToast()
const copied = ref(false)

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    success('Copied to clipboard')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    error('Failed to copy')
  }
}
</script>

<style scoped>
.code-block {
  border-radius: var(--nod8-radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nod8-space-1) var(--nod8-space-3);
  background-color: var(--nod8-bg-elevated);
  border-bottom: 1px solid var(--nod8-border);
}

.code-block__lang {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-secondary);
  text-transform: uppercase;
}

.code-block__copy {
  color: var(--nod8-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.code-block__copy:hover {
  color: var(--nod8-text-primary);
  background-color: var(--nod8-bg-muted);
}

.code-block__body {
  padding: var(--nod8-space-3);
  overflow: auto;
  background-color: var(--nod8-gray-950);
}

pre {
  margin: 0;
  font-family: var(--nod8-font-mono);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
  line-height: 1.5;
}
</style>
