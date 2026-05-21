<template>
  <section class="plugin-creator-test-panel" aria-label="Plugin Creator Test Panel">
    <header>
      <h2>Test Panel</h2>
      <button type="button" :disabled="!selectedMethod || isRunning" @click="runTest">
        {{ isRunning ? 'Running' : 'Run' }}
      </button>
    </header>

    <div v-if="selectedMethod" class="plugin-creator-test-panel__group">
      <h3>Method inputs</h3>
      <label v-for="input in selectedMethod.inputs" :key="input.name">
        <span>{{ input.name }}</span>
        <input
          :placeholder="input.placeholder ?? input.type"
          :value="params[input.name] ?? ''"
          @input="params[input.name] = eventValue($event)"
        />
      </label>
    </div>

    <div v-if="blueprint?.auth.fields.length" class="plugin-creator-test-panel__group">
      <h3>Test credentials</h3>
      <label v-for="field in blueprint.auth.fields" :key="field.name">
        <span>{{ field.label }}</span>
        <input
          :value="credentials[field.name] ?? ''"
          type="password"
          @input="credentials[field.name] = eventValue($event)"
        />
      </label>
    </div>

    <div class="plugin-creator-test-panel__group">
      <h3>Rendered request</h3>
      <pre>{{ renderedRequest }}</pre>
    </div>

    <div class="plugin-creator-test-panel__group">
      <h3>Response status</h3>
      <p>{{ lastTestResult?.status ?? 'Not run' }}</p>
    </div>

    <div class="plugin-creator-test-panel__group">
      <h3>Response headers</h3>
      <pre>{{ JSON.stringify(lastTestResult?.headers ?? {}, null, 2) }}</pre>
    </div>

    <div class="plugin-creator-test-panel__group">
      <h3>Response body</h3>
      <pre>{{ JSON.stringify(lastTestResult?.body ?? null, null, 2) }}</pre>
    </div>

    <div class="plugin-creator-test-panel__metrics">
      <span>Duration</span>
      <strong>{{ lastTestResult ? `${lastTestResult.durationMs}ms` : '-' }}</strong>
    </div>

    <div v-if="lastTestResult?.error" class="plugin-creator-test-panel__error">
      <span>Error</span>
      <p>{{ lastTestResult.error }}</p>
    </div>
    <div v-else class="plugin-creator-test-panel__error">
      <span>Error</span>
      <p>-</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type {
  PluginBlueprint,
  PluginCreatorTestMethodPayload,
  PluginCreatorTestResult,
} from '../../../core/types/plugin-creator.types.ts'

const props = withDefaults(
  defineProps<{
    blueprint?: PluginBlueprint | null
    selectedNodeId?: string | null
    lastTestResult?: PluginCreatorTestResult | null
    isRunning?: boolean
  }>(),
  {
    blueprint: null,
    selectedNodeId: null,
    lastTestResult: null,
    isRunning: false,
  },
)

const emit = defineEmits<{
  'test-method': [payload: PluginCreatorTestMethodPayload]
}>()

const params = reactive<Record<string, unknown>>({})
const credentials = reactive<Record<string, unknown>>({})

const selectedNode = computed(() => {
  if (!props.blueprint || !props.selectedNodeId) return null
  return props.blueprint.canvas.nodes[props.selectedNodeId] ?? null
})

const selectedMethod = computed(() => {
  if (!props.blueprint) return null
  const methodId = selectedNode.value?.data.methodId
  if (typeof methodId === 'string') {
    return props.blueprint.methods.find((method) => method.id === methodId) ?? null
  }
  return props.blueprint.methods[0] ?? null
})

const renderedRequest = computed(() => {
  if (props.lastTestResult) {
    return JSON.stringify(props.lastTestResult.request, null, 2)
  }
  if (!selectedMethod.value) return '{}'
  return JSON.stringify(
    {
      method: selectedMethod.value.request.method,
      url: selectedMethod.value.request.url,
      params,
      credentials: Object.keys(credentials).reduce<Record<string, string>>((masked, key) => {
        masked[key] = credentials[key] ? '***' : ''
        return masked
      }, {}),
    },
    null,
    2,
  )
})

function eventValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function runTest() {
  if (!selectedMethod.value) return
  emit('test-method', {
    methodId: selectedMethod.value.id,
    params: { ...params },
    credentials: { ...credentials },
  })
}
</script>

<style scoped>
.plugin-creator-test-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--sailor-border-subtle);
  background: var(--sailor-bg-base);
}

.plugin-creator-test-panel header,
.plugin-creator-test-panel__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plugin-creator-test-panel h2,
.plugin-creator-test-panel h3,
.plugin-creator-test-panel p {
  margin: 0;
}

.plugin-creator-test-panel h2 {
  color: var(--sailor-text-primary);
  font-size: 13px;
}

.plugin-creator-test-panel h3,
.plugin-creator-test-panel__metrics span,
.plugin-creator-test-panel__error span {
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.plugin-creator-test-panel button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(0, 214, 143, 0.35);
  border-radius: 6px;
  background: rgba(0, 214, 143, 0.16);
  color: var(--sailor-accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.plugin-creator-test-panel button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.plugin-creator-test-panel__group {
  display: grid;
  gap: 8px;
}

.plugin-creator-test-panel label {
  display: grid;
  gap: 5px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.plugin-creator-test-panel input {
  height: 32px;
  min-width: 0;
  padding: 0 9px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: 13px;
}

.plugin-creator-test-panel pre {
  max-height: 140px;
  margin: 0;
  padding: 9px;
  overflow: auto;
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.plugin-creator-test-panel__metrics strong,
.plugin-creator-test-panel__error p {
  color: var(--sailor-text-primary);
  font-size: 13px;
}
</style>
