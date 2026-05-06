<template>
  <div class="editor-stack">
    <!-- ── Trigger Type ── -->
    <EditorField label="Trigger Type">
      <BaseSelect
        :model-value="(node.data.type as string) || 'manual'"
        :options="TRIGGER_OPTIONS"
        @update:model-value="updateNodeData({ type: $event as any })"
      />
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
              <BaseInput
                :model-value="String(key)"
                @blur="updateSchemaKey(String(key), ($event.target as HTMLInputElement).value)"
                placeholder="Field name"
              />
              <button class="te-remove-btn" @click="removeSchemaField(String(key))">
                <XIcon :size="12" />
              </button>
            </div>
            <div class="te-card-row">
              <div style="width: 140px; flex-shrink: 0;">
                <BaseSelect
                  :model-value="(field as any).type as string"
                  :options="MANUAL_FIELD_TYPES"
                  @update:model-value="
                    updateSchemaField(String(key), {
                      type: $event as any,
                    })
                  "
                />
              </div>
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

        <!-- Endpoint Slug -->
        <div class="te-field">
          <span class="te-label">
            Endpoint Slug
            <span class="te-label-sub">(optional, readable name)</span>
          </span>
          <BaseInput
            type="text"
            :model-value="(node.data as unknown as WorkflowTrigger).webhookSlug || ''"
            @update:model-value="updateNodeData({ webhookSlug: $event as string || undefined })"
            placeholder="nova-venda"
          />
          <p class="te-hint">kebab-case only — replaces the auto-generated path.</p>
        </div>

        <!-- URL display — test vs. production -->
        <div class="te-field">
          <span class="te-label">Webhook URLs</span>
          <div class="te-url-group">
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--test">TEST</span>
              <div class="te-url-box">{{ testWebhookUrl }}</div>
              <button class="te-icon-btn" @click="copyUrl(testWebhookUrl, 'test')">
                <CheckIcon v-if="copied === 'test'" :size="14" style="color: var(--nod8-green-400)" />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--prod">PROD</span>
              <div class="te-url-box">{{ prodWebhookUrl }}</div>
              <button class="te-icon-btn" @click="copyUrl(prodWebhookUrl, 'prod')">
                <CheckIcon v-if="copied === 'prod'" :size="14" style="color: var(--nod8-green-400)" />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
          </div>
          <p class="te-hint">Test URL works for any workflow. Prod URL requires publishing.</p>
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
            <BaseInput
              type="password"
              :model-value="(node.data as unknown as WorkflowTrigger).webhookSecret || ''"
              @update:model-value="updateNodeData({ webhookSecret: $event as string })"
              placeholder="my-secret-key"
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

        <!-- Expected Body Schema -->
        <div class="te-section">
          <div class="te-intro">
            <span class="te-label">Expected Body</span>
            <p class="te-hint">Document the fields this webhook expects to receive.</p>
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="(field, key, index) in (node.data as unknown as WorkflowTrigger).webhookBodySchema || {}"
              :key="index"
              class="te-card"
            >
              <div class="te-card-header">
                <BaseInput
                  :model-value="String(key)"
                  @blur="updateBodySchemaKey(String(key), ($event.target as HTMLInputElement).value)"
                  placeholder="Field name"
                />
                <button class="te-remove-btn" @click="removeBodySchemaField(String(key))">
                  <XIcon :size="12" />
                </button>
              </div>
              <div class="te-card-row">
                <div style="width: 140px; flex-shrink: 0;">
                  <BaseSelect
                    :model-value="(field as any).type as string"
                    :options="WEBHOOK_FIELD_TYPES"
                    @update:model-value="updateBodySchemaField(String(key), { type: $event as any })"
                  />
                </div>
                <label class="te-req-label">
                  <input
                    type="checkbox"
                    :checked="(field as any).required"
                    @change="updateBodySchemaField(String(key), { required: ($event.target as HTMLInputElement).checked })"
                  />
                  Req
                </label>
              </div>
            </div>
          </div>

          <button class="editor-add-btn" @click="addBodySchemaField">
            <PlusIcon :size="14" /> Add Body Field
          </button>
        </div>

      </div>
    </template>

    <!-- ── CRON ── -->
    <template v-if="node.data.type === 'cron'">
      <div class="te-section">
        <div class="te-field">
          <span class="te-label">Cron Expression</span>
          <BaseInput
            :model-value="(node.data as unknown as WorkflowTrigger).cronExpression || ''"
            @update:model-value="updateNodeData({ cronExpression: $event as string })"
            placeholder="* * * * *"
            style="font-family: var(--nod8-font-mono)"
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
              :class="{ 'te-preset-btn--active': (node.data as unknown as WorkflowTrigger).cronExpression === p.value }"
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
          <BaseInput
            :model-value="(node.data as unknown as WorkflowTrigger).eventName || ''"
            @update:model-value="updateNodeData({ eventName: $event as string })"
            placeholder="video.uploaded"
            style="font-family: var(--nod8-font-mono)"
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
import type { WorkflowTrigger, WorkflowSchemaField, WebhookBodyField } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { API_BASE_URL } from '@/core/constants/app'

const props = defineProps<NodeEditorProps>()

const TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual', icon: 'hand' },
  { value: 'webhook', label: 'Webhook', icon: 'globe' },
  { value: 'cron', label: 'Cron / Schedule', icon: 'clock' },
  { value: 'event', label: 'Event', icon: 'zap' },
]

const MANUAL_FIELD_TYPES = [
  { value: 'string', label: 'String', icon: 'type' },
  { value: 'number', label: 'Number', icon: 'hash' },
  { value: 'file', label: 'File', icon: 'file' },
]

const WEBHOOK_FIELD_TYPES = [
  { value: 'string', label: 'String', icon: 'type' },
  { value: 'number', label: 'Number', icon: 'hash' },
  { value: 'boolean', label: 'Boolean', icon: 'toggle-left' },
  { value: 'object', label: 'Object', icon: 'braces' },
  { value: 'array', label: 'Array', icon: 'list' },
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

const copied = ref<'test' | 'prod' | null>(null)

function resolvedPath(): string {
  const trigger = props.node.data as unknown as WorkflowTrigger
  return trigger.webhookSlug || trigger.webhookPath || '<auto-assigned-on-save>'
}

const testWebhookUrl = computed(() => `${API_BASE_URL}/webhook-test/${resolvedPath()}`)
const prodWebhookUrl = computed(() => `${API_BASE_URL}/webhook/${resolvedPath()}`)

const allowedMethods = computed<string[]>(() => {
  return (props.node.data as unknown as WorkflowTrigger).webhookMethods ?? ['POST']
})

const humanCron = computed(() => humanizeCron((props.node.data as unknown as WorkflowTrigger).cronExpression))

function toggleMethod(method: string) {
  const current = allowedMethods.value
  if (current.includes(method)) {
    const next = current.filter((m) => m !== method)
    props.updateNodeData({ webhookMethods: next.length ? next : ['POST'] })
  } else {
    props.updateNodeData({ webhookMethods: [...current, method] })
  }
}

async function copyUrl(url: string, which: 'test' | 'prod') {
  await navigator.clipboard.writeText(url)
  copied.value = which
  setTimeout(() => { copied.value = null }, 2000)
}

function generateSecret() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  const secret = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
  props.updateNodeData({ webhookSecret: secret })
}

// ── Manual schema helpers ──────────────────────────────────

function updateSchemaKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return
  const currentSchema = (props.node.data as unknown as WorkflowTrigger).schema || {}
  const newSchema = { ...currentSchema }
  const val = newSchema[oldKey]
  delete newSchema[oldKey]
  if (val) newSchema[newKey] = val
  props.updateNodeData({ schema: newSchema })
}

function removeSchemaField(key: string) {
  const currentSchema = (props.node.data as unknown as WorkflowTrigger).schema || {}
  const newSchema = { ...currentSchema }
  delete newSchema[key]
  props.updateNodeData({ schema: newSchema })
}

function updateSchemaField(key: string, updates: Partial<WorkflowSchemaField>) {
  const currentSchema = (props.node.data as unknown as WorkflowTrigger).schema || {}
  props.updateNodeData({
    schema: { ...currentSchema, [key]: { ...currentSchema[key], ...updates } },
  })
}

function addSchemaField() {
  const currentSchema = (props.node.data as unknown as WorkflowTrigger).schema || {}
  const num = Object.keys(currentSchema).length
  props.updateNodeData({
    schema: { ...currentSchema, [`field${num}`]: { type: 'string', required: false } },
  })
}

// ── Webhook body schema helpers ────────────────────────────

function updateBodySchemaKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return
  const schema = (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {}
  const next = { ...schema }
  const val = next[oldKey]
  delete next[oldKey]
  if (val) next[newKey] = val
  props.updateNodeData({ webhookBodySchema: next })
}

function removeBodySchemaField(key: string) {
  const schema = (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {}
  const next = { ...schema }
  delete next[key]
  props.updateNodeData({ webhookBodySchema: next })
}

function updateBodySchemaField(key: string, updates: Partial<WebhookBodyField>) {
  const schema = (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {}
  props.updateNodeData({
    webhookBodySchema: { ...schema, [key]: { ...schema[key], ...updates } },
  })
}

function addBodySchemaField() {
  const schema = (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {}
  const num = Object.keys(schema).length
  props.updateNodeData({
    webhookBodySchema: { ...schema, [`field${num}`]: { type: 'string', required: false } },
  })
}
</script>

<style scoped>
/* ── URL group (test + prod stacked) ───────── */
.te-url-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.te-url-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.te-url-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--nod8-radius-sm);
  flex-shrink: 0;
}

.te-url-badge--test {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.te-url-badge--prod {
  background: color-mix(in srgb, var(--nod8-green-400) 15%, transparent);
  color: var(--nod8-green-400);
}
</style>
