<template>
  <div class="json-viewer surface">
    <div class="json-viewer__header">
      <span class="json-viewer__title">{{ title || 'JSON Data' }}</span>
      <button class="json-viewer__copy" @click="copy" title="Copy JSON">
        <LucideIcon :name="copied ? 'check' : 'copy'" :size="14" />
      </button>
    </div>
    <div class="json-viewer__body">
      <pre><code>{{ formattedJson }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useToast } from '@/shared/composables/useToast'

const props = defineProps<{
  data: any
  title?: string
}>()

const { success, error } = useToast()
const copied = ref(false)

const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.data, null, 2)
  } catch (e) {
    return String(props.data)
  }
})

const copy = async () => {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
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
.json-viewer {
  border-radius: var(--sailor-radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.json-viewer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-2) var(--sailor-space-3);
  background-color: var(--sailor-bg-elevated);
  border-bottom: 1px solid var(--sailor-border);
}

.json-viewer__title {
  font-size: var(--sailor-text-xs);
  font-family: var(--sailor-font-mono);
  color: var(--sailor-text-secondary);
}

.json-viewer__copy {
  color: var(--sailor-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.json-viewer__copy:hover {
  color: var(--sailor-text-primary);
  background-color: var(--sailor-bg-muted);
}

.json-viewer__body {
  padding: var(--sailor-space-3);
  overflow: auto;
  max-height: 400px;
}

pre {
  margin: 0;
  font-family: var(--sailor-font-mono);
  font-size: var(--sailor-text-xs);
  color: var(--sailor-green-400); /* gives it a hacker term feel */
  line-height: 1.5;
}
</style>
