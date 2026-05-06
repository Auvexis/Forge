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

    <!-- ── PLUGIN TRIGGER ── -->
    <template v-if="(node.data as unknown as WorkflowTrigger).type === 'plugin'">
      <div class="te-section">

        <!-- Plugin Selector -->
        <div class="te-field">
          <span class="te-label">Integration</span>
          <BaseSelect
            :model-value="(node.data as unknown as WorkflowTrigger).pluginId || ''"
            :options="pluginTriggerOptions"
            @update:model-value="onPluginChange($event as string)"
          />
          <p class="te-hint">Only plugins that support triggers are listed.</p>
        </div>

        <!-- Trigger Name Selector -->
        <div class="te-field" v-if="selectedPlugin && availableTriggers.length > 0">
          <span class="te-label">Event / Trigger</span>
          <BaseSelect
            :model-value="(node.data as unknown as WorkflowTrigger).triggerName || ''"
            :options="availableTriggers"
            @update:model-value="updateNodeData({ triggerName: $event as string })"
          />
        </div>

        <!-- Endpoint Slug -->
        <div class="te-field" v-if="(node.data as unknown as WorkflowTrigger).pluginId">
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
        <div class="te-field" v-if="(node.data as unknown as WorkflowTrigger).pluginId">
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

        <!-- Trigger Params -->
        <template v-if="selectedTriggerManifest?.parameters?.properties">
          <div class="te-section" style="padding-top:0">
            <div class="te-intro"><span class="te-label">Trigger Settings</span></div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(propSchema, propKey) in selectedTriggerManifest.parameters.properties"
                :key="String(propKey)"
                class="te-field"
              >
                <span class="te-label">{{ propSchema['x-label'] || propKey }}</span>
                <p v-if="propSchema.description" class="te-hint">{{ propSchema.description }}</p>
                <BaseInput
                  :model-value="String((node.data as unknown as WorkflowTrigger).triggerParams?.[String(propKey)] ?? '')"
                  @update:model-value="updateTriggerParam(String(propKey), $event as string)"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Listen for Event -->
        <div class="te-section" v-if="(node.data as unknown as WorkflowTrigger).pluginId">
          <div class="te-intro">
            <span class="te-label">Test Trigger</span>
            <p class="te-hint">
              Click "Listen", then trigger an event in your app. Nod8 will capture the payload
              so you can map variables from it in the inspector.
            </p>
          </div>

          <button v-if="listenState === 'idle'" class="te-listen-btn" @click="startListening">
            <RadioIcon :size="14" />
            Listen for Event
          </button>

          <div v-else-if="listenState === 'listening'" class="te-listen-status te-listen-status--listening">
            <div class="te-listen-pulse" />
            <span>Waiting for event… ({{ listenCountdown }}s)</span>
            <button class="te-listen-cancel" @click="cancelListening">Cancel</button>
          </div>

          <div v-else-if="listenState === 'captured'" class="te-listen-status te-listen-status--captured">
            <CheckCircleIcon :size="14" style="color: var(--nod8-green-400)" />
            <span>Event captured! Open the inspector left pane to view the payload.</span>
          </div>

          <div v-else-if="listenState === 'timeout'" class="te-listen-status te-listen-status--timeout">
            <ClockIcon :size="14" />
            <span>Timed out after 2 minutes.</span>
            <button class="te-listen-cancel" @click="listenState = 'idle'">Dismiss</button>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { XIcon, PlusIcon, CopyIcon, CheckIcon, RefreshCwIcon, RadioIcon, CheckCircleIcon, ClockIcon } from 'lucide-vue-next'
import type { NodeEditorProps } from './types'
import type { WorkflowTrigger, WorkflowSchemaField, WebhookBodyField } from '@/core/types/workflow.types'
import type { PluginSummary, PluginTriggerManifest } from '@/core/types/plugin.types'
import EditorField from './EditorField.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { API_BASE_URL } from '@/core/constants/app'
import { pluginsApi } from '@/core/api/plugins.api'
import { workflowsApi } from '@/core/api/workflows.api'
import { useWorkflowStore } from '../../../stores/workflow.store'

const props = defineProps<NodeEditorProps>()
const workflowStore = useWorkflowStore()

const TRIGGER_OPTIONS = [
  { value: 'manual', label: 'Manual', icon: 'hand' },
  { value: 'webhook', label: 'Webhook', icon: 'globe' },
  { value: 'cron', label: 'Cron / Schedule', icon: 'clock' },
  { value: 'event', label: 'Event', icon: 'zap' },
  { value: 'plugin', label: 'Plugin Trigger', icon: 'plug' },
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

// ── Plugin Trigger ──────────────────────────────────────────

const allPlugins = ref<PluginSummary[]>([])

// Fetch plugins lazily when the trigger type is "plugin"
async function loadPlugins() {
  if (allPlugins.value.length === 0) {
    try {
      allPlugins.value = await pluginsApi.getAll()
    } catch { /* fail silently */ }
  }
}
loadPlugins()

// Only plugins that expose at least one trigger
const pluginsWithTriggers = computed(() =>
  allPlugins.value.filter((p) => p.manifest.triggers && Object.keys(p.manifest.triggers).length > 0)
)

const pluginTriggerOptions = computed(() =>
  pluginsWithTriggers.value.map((p) => ({
    value: p.id,
    label: p.manifest.metadata.name,
    icon: 'plug',
  }))
)

const selectedPlugin = computed(() =>
  allPlugins.value.find((p) => p.id === (props.node.data as unknown as WorkflowTrigger).pluginId)
)

const availableTriggers = computed(() => {
  const triggers = selectedPlugin.value?.manifest.triggers
  if (!triggers) return []
  return Object.entries(triggers).map(([key, t]) => ({
    value: key,
    label: t.metadata.label,
    icon: 'zap',
  }))
})

const selectedTriggerManifest = computed((): PluginTriggerManifest | null => {
  const trigger = props.node.data as unknown as WorkflowTrigger
  if (!trigger.triggerName || !selectedPlugin.value) return null
  return selectedPlugin.value.manifest.triggers?.[trigger.triggerName] ?? null
})

function onPluginChange(pluginId: string) {
  props.updateNodeData({ pluginId, triggerName: undefined, triggerParams: {} })
}

function updateTriggerParam(key: string, value: string) {
  const current = (props.node.data as unknown as WorkflowTrigger).triggerParams ?? {}
  props.updateNodeData({ triggerParams: { ...current, [key]: value } })
}

// ── Listen for Event state machine ────────────────────────────

type ListenState = 'idle' | 'listening' | 'captured' | 'timeout'
const listenState = ref<ListenState>('idle')
const listenCountdown = ref(120)

let _listenEs: EventSource | null = null
let _countdownInterval: ReturnType<typeof setInterval> | null = null

function startListening() {
  const workflowId = workflowStore.activeWorkflow?.metadata.id
  if (!workflowId) return

  listenState.value = 'listening'
  listenCountdown.value = 120

  _countdownInterval = setInterval(() => {
    listenCountdown.value--
    if (listenCountdown.value <= 0) {
      clearInterval(_countdownInterval!)
      _countdownInterval = null
    }
  }, 1000)

  _listenEs = workflowsApi.listenForTrigger(workflowId)

  _listenEs.onmessage = (rawEvt: MessageEvent) => {
    try {
      const ev = JSON.parse(rawEvt.data as string) as { type: string; payload?: Record<string, any> }

      if (ev.type === 'captured' && ev.payload) {
        listenState.value = 'captured'
        // Immediately update the workflow store so the left pane refreshes
        if (workflowStore.activeWorkflow) {
          workflowStore.activeWorkflow.trigger.lastTriggerPayload = ev.payload
        }
        cleanup()
      } else if (ev.type === 'timeout') {
        listenState.value = 'timeout'
        cleanup()
      }
    } catch { /* ignore malformed */ }
  }

  _listenEs.onerror = () => {
    if (listenState.value === 'listening') {
      listenState.value = 'idle'
    }
    cleanup()
  }
}

function cancelListening() {
  listenState.value = 'idle'
  cleanup()
}

function cleanup() {
  if (_listenEs) {
    _listenEs.close()
    _listenEs = null
  }
  if (_countdownInterval) {
    clearInterval(_countdownInterval)
    _countdownInterval = null
  }
}

onUnmounted(() => cleanup())
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

/* ── Listen for Event ───────────────────────── */
.te-listen-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--nod8-radius-md);
  background: color-mix(in srgb, var(--nod8-accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--nod8-accent) 35%, transparent);
  color: var(--nod8-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}
.te-listen-btn:hover {
  background: color-mix(in srgb, var(--nod8-accent) 22%, transparent);
}

.te-listen-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--nod8-radius-md);
  font-size: 12px;
  font-weight: 500;
}

.te-listen-status--listening {
  background: color-mix(in srgb, var(--nod8-amber-400) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--nod8-amber-400) 30%, transparent);
  color: var(--nod8-amber-400);
}

.te-listen-status--captured {
  background: color-mix(in srgb, var(--nod8-green-400) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--nod8-green-400) 30%, transparent);
  color: var(--nod8-green-400);
}

.te-listen-status--timeout {
  background: color-mix(in srgb, var(--nod8-text-muted) 8%, transparent);
  border: 1px solid var(--nod8-border-subtle);
  color: var(--nod8-text-muted);
}

.te-listen-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--nod8-amber-400);
  flex-shrink: 0;
  animation: te-pulse 1.2s ease-in-out infinite;
}

@keyframes te-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.te-listen-cancel {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: inherit;
  opacity: 0.7;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--nod8-radius-sm);
  transition: opacity 0.15s;
}
.te-listen-cancel:hover { opacity: 1; }
</style>
