<template>
  <div class="editor-stack">
    <!-- ── Trigger Type ── -->
    <EditorField label="Trigger Type">
      <select
        :value="node.data.type || 'manual'"
        @change="updateNodeData({ type: ($event.target as HTMLSelectElement).value as any })"
        class="editor-select font-bold"
      >
        <option v-for="opt in TRIGGER_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </EditorField>

    <!-- ── MANUAL ── -->
    <template v-if="node.data.type === 'manual' || !node.data.type">
      <div class="te-section">
        <div class="te-intro">
          <span class="te-label">Expected Manual Inputs</span>
          <p class="te-hint">Fields user must fill when running manually.</p>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="(field, key, index) in node.data.schema || {}" :key="index" class="te-card">
            <div class="te-card-header">
              <input
                :value="key"
                class="te-key-input"
                @blur="updateSchemaKey(String(key), ($event.target as HTMLInputElement).value)"
                placeholder="Field name"
              />
              <button class="te-remove-btn" @click="removeSchemaField(String(key))">
                <XIcon :size="12" />
              </button>
            </div>
            <div class="te-card-row">
              <select
                :value="(field as any).type"
                @change="
                  updateSchemaField(String(key), {
                    type: ($event.target as HTMLSelectElement).value,
                  })
                "
                class="te-type-select"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="file">File</option>
              </select>
              <label class="te-req-label">
                <input
                  type="checkbox"
                  :checked="(field as any).required"
                  @change="
                    updateSchemaField(String(key), {
                      required: ($event.target as HTMLInputElement).checked,
                    })
                  "
                />
                Req
              </label>
            </div>
          </div>
        </div>

        <button class="editor-add-btn" @click="addSchemaField">
          <PlusIcon :size="14" /> Add Expected Input
        </button>
      </div>
    </template>

    <!-- ── WEBHOOK ── -->
    <template v-if="node.data.type === 'webhook'">
      <div class="te-section">
        <!-- URL display -->
        <div class="te-field">
          <span class="te-label">Webhook URL</span>
          <div class="te-input-row">
            <div class="te-url-box">{{ webhookUrl }}</div>
            <button class="te-icon-btn" @click="copyUrl">
              <CheckIcon v-if="copiedUrl" :size="14" style="color: var(--nod8-green-400)" />
              <CopyIcon v-else :size="14" />
            </button>
          </div>
          <p class="te-hint">Save the workflow to auto-generate a unique webhook path.</p>
        </div>

        <!-- HTTP Methods -->
        <div class="te-field">
          <span class="te-label">Allowed HTTP Methods</span>
          <div class="te-methods">
            <button
              v-for="m in HTTP_METHODS"
              :key="m"
              type="button"
              @click="toggleMethod(m)"
              class="te-method-btn"
              :class="{ 'te-method-btn--active': allowedMethods.includes(m) }"
            >
              {{ m }}
            </button>
          </div>
        </div>

        <!-- HMAC Secret -->
        <div class="te-field">
          <span class="te-label">
            HMAC Secret
            <span class="te-label-sub">(recommended)</span>
          </span>
          <div class="te-input-row">
            <input
              type="password"
              :value="node.data.webhookSecret || ''"
              @input="updateNodeData({ webhookSecret: ($event.target as HTMLInputElement).value })"
              placeholder="my-secret-key"
              class="editor-input te-password-input"
            />
            <button class="te-icon-btn" title="Generate random secret" @click="generateSecret">
              <RefreshCwIcon :size="14" />
            </button>
          </div>
          <p class="te-hint">
            Validate requests using
            <code class="editor-code-snippet">X-Nod8-Signature: sha256=…</code>
          </p>
        </div>
      </div>
    </template>

    <!-- ── CRON ── -->
    <template v-if="node.data.type === 'cron'">
      <div class="te-section">
        <div class="te-field">
          <span class="te-label">Cron Expression</span>
          <input
            :value="node.data.cronExpression || ''"
            @input="updateNodeData({ cronExpression: ($event.target as HTMLInputElement).value })"
            placeholder="* * * * *"
            class="editor-input te-cron-input"
          />
          <p v-if="humanCron" class="te-human-cron">↳ {{ humanCron }}</p>
          <div class="te-info-blue">
            Format: <code class="font-mono">minute hour day month weekday</code><br />
            Example: <code class="font-mono">0 9 * * 1-5</code> (Mon–Fri at 9:00 AM)
          </div>
        </div>

        <div class="te-field">
          <span class="te-label">Presets</span>
          <div class="te-presets">
            <button
              v-for="p in CRON_PRESETS"
              :key="p.value"
              type="button"
              @click="updateNodeData({ cronExpression: p.value })"
              class="te-preset-btn"
              :class="{ 'te-preset-btn--active': node.data.cronExpression === p.value }"
            >
              <span class="te-preset-label">{{ p.label }}</span>
              <code class="te-preset-value">{{ p.value }}</code>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── EVENT ── -->
    <template v-if="node.data.type === 'event'">
      <div class="te-section">
        <div class="te-field">
          <span class="te-label">Internal Event Name</span>
          <input
            :value="node.data.eventName || ''"
            @input="updateNodeData({ eventName: ($event.target as HTMLInputElement).value })"
            placeholder="video.uploaded"
            class="editor-input te-event-input"
          />
          <p class="te-hint">
            This workflow will run whenever an <strong>Emit Event</strong> node or the
            <code class="editor-code-snippet">/events/emit</code> API emits this event name.
          </p>
        </div>

        <div class="te-info-yellow">
          <p class="te-info-yellow__title">How it works</p>
          <p class="te-info-yellow__body">
            Use an <strong>Emit Event</strong> node in another workflow to trigger this one. The
            emitted payload will be available in
            <code class="font-mono" style="color: #eab308" v-pre>{{ trigger.payload }}</code
            >.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { XIcon, PlusIcon, CopyIcon, CheckIcon, RefreshCwIcon } from 'lucide-vue-next'
import type { NodeEditorProps } from './types'
import type { WorkflowTrigger, WorkflowSchemaField } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import { API_BASE_URL } from '@/core/constants/app'

const props = defineProps<NodeEditorProps>()

const TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'cron', label: 'Cron / Schedule' },
  { value: 'event', label: 'Event' },
]

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Mon–Fri at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Sunday at noon', value: '0 12 * * 0' },
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const

function humanizeCron(expression: string | undefined): string {
  if (!expression) return ''
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return 'Invalid expression'
    const [min, hour, dom, month, dow] = parts
    if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*')
      return 'Every minute'
    if (min === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*')
      return 'Every hour at minute 0'
    if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === '*')
      return 'Every day at midnight'
    if (dom === '*' && month === '*' && dow === '*')
      return `Every day at ${hour?.padStart(2, '0')}:${min?.padStart(2, '0')}`
    if (dom === '*' && month === '*' && dow !== '*')
      return `On day(s) ${dow} at ${hour?.padStart(2, '0')}:${min?.padStart(2, '0')}`
    return expression
  } catch {
    return ''
  }
}

const copiedUrl = ref(false)

const webhookUrl = computed(() => {
  const path = (props.node.data as WorkflowTrigger).webhookPath || ''
  return path
    ? `${API_BASE_URL}/webhooks/${path}`
    : `${API_BASE_URL}/webhooks/<auto-assigned-on-save>`
})

const allowedMethods = computed<string[]>(() => {
  return (props.node.data as WorkflowTrigger).webhookMethods ?? ['POST']
})

const humanCron = computed(() => humanizeCron((props.node.data as WorkflowTrigger).cronExpression))

function toggleMethod(method: string) {
  const current = allowedMethods.value
  if (current.includes(method)) {
    const next = current.filter((m) => m !== method)
    props.updateNodeData({ webhookMethods: next.length ? next : ['POST'] })
  } else {
    props.updateNodeData({ webhookMethods: [...current, method] })
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(webhookUrl.value)
  copiedUrl.value = true
  setTimeout(() => {
    copiedUrl.value = false
  }, 2000)
}

function generateSecret() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  const secret = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  props.updateNodeData({ webhookSecret: secret })
}

// Manual schema helpers
function updateSchemaKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return
  const currentSchema = (props.node.data as WorkflowTrigger).schema || {}
  const newSchema = { ...currentSchema }
  const val = newSchema[oldKey]
  delete newSchema[oldKey]
  newSchema[newKey] = val
  props.updateNodeData({ schema: newSchema })
}

function removeSchemaField(key: string) {
  const currentSchema = (props.node.data as WorkflowTrigger).schema || {}
  const newSchema = { ...currentSchema }
  delete newSchema[key]
  props.updateNodeData({ schema: newSchema })
}

function updateSchemaField(key: string, updates: Partial<WorkflowSchemaField>) {
  const currentSchema = (props.node.data as WorkflowTrigger).schema || {}
  props.updateNodeData({
    schema: {
      ...currentSchema,
      [key]: { ...currentSchema[key], ...updates },
    },
  })
}

function addSchemaField() {
  const currentSchema = (props.node.data as WorkflowTrigger).schema || {}
  const num = Object.keys(currentSchema).length
  props.updateNodeData({
    schema: {
      ...currentSchema,
      [`field${num}`]: { type: 'string', required: false },
    },
  })
}
</script>
