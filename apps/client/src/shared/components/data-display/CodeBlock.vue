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
  border-radius: var(--sailor-radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-1) var(--sailor-space-3);
  background-color: var(--sailor-bg-elevated);
  border-bottom: 1px solid var(--sailor-border);
}

.code-block__lang {
  font-size: var(--sailor-text-xs);
  font-family: var(--sailor-font-mono);
  color: var(--sailor-text-secondary);
  text-transform: uppercase;
}

.code-block__copy {
  color: var(--sailor-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.code-block__copy:hover {
  color: var(--sailor-text-primary);
  background-color: var(--sailor-bg-muted);
}

.code-block__body {
  padding: var(--sailor-space-3);
  overflow: auto;
  background-color: var(--sailor-gray-950);
}

pre {
  margin: 0;
  font-family: var(--sailor-font-mono);
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-primary);
  line-height: 1.5;
}
</style>
