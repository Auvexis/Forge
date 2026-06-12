<template>
  <div class="agent-memory-scope-picker">
    <BaseSelect
      :model-value="scope"
      :options="MEMORY_SCOPES"
      @update:model-value="handleScopeChange($event as AgentMemoryScope)"
    />

    <div class="agent-memory-scope-picker__access">
      <BaseSwitch
        :model-value="readEnabled"
        label="Read memory"
        @update:model-value="emit('update:readEnabled', $event)"
      />
      <BaseSwitch
        :model-value="writeEnabled && !writeDisabled"
        label="Write memory"
        :disabled="writeDisabled"
        :title="writeDisabled ? 'Writes require workflow, profile, or user scope.' : undefined"
        @update:model-value="emit('update:writeEnabled', $event)"
      />
      <span class="agent-memory-scope-picker__write-state">
        {{ writeEnabled && !writeDisabled ? 'Long-term writes enabled' : 'Long-term writes disabled' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import type { AgentMemoryScope } from '@/features/agent-runtime/types/agent.types'

const props = withDefaults(
  defineProps<{
    scope?: AgentMemoryScope
    readEnabled?: boolean
    writeEnabled?: boolean
  }>(),
  {
    scope: 'session',
    readEnabled: true,
    writeEnabled: false,
  },
)

const emit = defineEmits<{
  'update:scope': [value: AgentMemoryScope]
  'update:readEnabled': [value: boolean]
  'update:writeEnabled': [value: boolean]
}>()

const MEMORY_SCOPES: Array<{ value: AgentMemoryScope; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'session', label: 'Session' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'profile', label: 'Profile' },
  { value: 'user', label: 'User' },
]

const writeDisabled = computed(() => props.scope === 'none' || props.scope === 'session')

function handleScopeChange(scope: AgentMemoryScope) {
  emit('update:scope', scope)

  if (scope === 'none' || scope === 'session') {
    emit('update:writeEnabled', false)
  }
}
</script>

<style scoped>
.agent-memory-scope-picker {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.agent-memory-scope-picker__access {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.agent-memory-scope-picker__write-state {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}
</style>
