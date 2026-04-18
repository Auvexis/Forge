<template>
  <div class="editor-stack">
    <!-- Trigger Type -->
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

    <!-- MANUAL -->
    <template v-if="node.data.type === 'manual'">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Expected Manual Inputs
          </label>
          <p class="text-mini text-muted-foreground ml-1 opacity-70 italic">
            Fields user must fill when running manually.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="(field, key, index) in node.data.schema || {}"
            :key="index"
            class="flex flex-col gap-2 p-3 border border-border/50 rounded-xl bg-accent/5"
          >
            <div
              class="flex justify-between items-center bg-accent/10 -m-3 p-3 rounded-t-xl border-b border-border/30 mb-1"
            >
              <input
                :value="key"
                class="editor-input h-8 text-xs w-[180px] font-medium px-2 bg-input border border-border p-0"
                @blur="updateSchemaKey(String(key), ($event.target as HTMLInputElement).value)"
                placeholder="Field name"
              />
              <button
                class="flex-none bg-transparent hover:bg-destructive/10 text-destructive/70 hover:text-destructive h-6 w-6 rounded-full flex items-center justify-center transition-colors"
                @click="removeSchemaField(String(key))"
              >
                <XIcon class="w-3 h-3" />
              </button>
            </div>
            <div class="flex gap-2 pt-1">
              <select
                :value="(field as any).type"
                @change="
                  updateSchemaField(String(key), {
                    type: ($event.target as HTMLSelectElement).value,
                  })
                "
                class="editor-select flex-1 h-8 text-xs font-bold"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="file">File</option>
              </select>
              <label
                class="flex items-center gap-2 text-mini font-bold bg-background border border-border rounded-lg px-3 uppercase tracking-tighter cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="(field as any).required"
                  class="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
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

        <button
          class="editor-add-btn mt-1 rounded-xl h-9 font-black text-mini uppercase tracking-widest border-dashed"
          @click="addSchemaField"
        >
          <PlusIcon class="w-3.5 h-3.5 mr-1" /> Add Expected Input
        </button>
      </div>
    </template>

    <!-- WEBHOOK -->
    <template v-if="node.data.type === 'webhook'">
      <div class="flex flex-col gap-4">
        <!-- URL display -->
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Webhook URL
          </label>
          <div class="flex gap-2">
            <div
              class="flex-1 p-3 bg-accent/10 border border-border/50 rounded-xl font-mono text-mini break-all select-all text-muted-foreground whitespace-pre-wrap"
            >
              {{ webhookUrl }}
            </div>
            <button
              class="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl border border-border/50 bg-transparent hover:bg-accent/10 transition-colors"
              @click="copyUrl"
            >
              <CheckIcon v-if="copiedUrl" class="w-3.5 h-3.5 text-emerald-500" />
              <CopyIcon v-else class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p class="text-mini text-muted-foreground italic ml-1">
            Save the workflow to auto-generate a unique webhook path.
          </p>
        </div>

        <!-- HTTP Methods -->
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Allowed HTTP Methods
          </label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="m in HTTP_METHODS"
              :key="m"
              type="button"
              @click="toggleMethod(m)"
              class="px-3 py-1.5 rounded-lg text-mini font-black uppercase tracking-wider border transition-colors h-auto"
              :class="
                allowedMethods.includes(m)
                  ? 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/25 hover:text-primary shadow-none'
                  : 'bg-accent/10 border-border/50 text-muted-foreground hover:bg-accent/15 hover:text-muted-foreground shadow-none'
              "
            >
              {{ m }}
            </button>
          </div>
        </div>

        <!-- Secret -->
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            HMAC Secret
            <span class="text-micro opacity-50 normal-case font-normal">(recommended)</span>
          </label>
          <div class="flex gap-2">
            <input
              type="password"
              :value="node.data.webhookSecret || ''"
              @input="updateNodeData({ webhookSecret: ($event.target as HTMLInputElement).value })"
              placeholder="my-secret-key"
              class="editor-input h-10 font-mono bg-accent/5 flex-1"
            />
            <button
              class="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl border border-border/50 bg-transparent hover:bg-accent/10 transition-colors"
              title="Generate random secret"
              @click="generateSecret"
            >
              <RefreshCwIcon class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p class="text-mini text-muted-foreground italic ml-1">
            Validate requests using <code class="font-mono">X-Nod8-Signature: sha256=…</code>
          </p>
        </div>
      </div>
    </template>

    <!-- CRON -->
    <template v-if="node.data.type === 'cron'">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Cron Expression
          </label>
          <input
            :value="node.data.cronExpression || ''"
            @input="updateNodeData({ cronExpression: ($event.target as HTMLInputElement).value })"
            placeholder="* * * * *"
            class="editor-input h-10 font-mono bg-accent/5"
          />
          <p v-if="humanCron" class="text-mini text-primary/80 ml-1 font-bold">↳ {{ humanCron }}</p>
          <div
            class="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg text-mini text-blue-400"
          >
            Format: <code class="font-mono">minute hour day month weekday</code><br />
            Example: <code class="font-mono">0 9 * * 1-5</code> (Mon–Fri at 9:00 AM)
          </div>
        </div>

        <!-- Presets -->
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Presets
          </label>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="p in CRON_PRESETS"
              :key="p.value"
              type="button"
              @click="updateNodeData({ cronExpression: p.value })"
              class="flex h-auto w-full flex-col items-stretch p-2.5 rounded-xl border text-left font-normal shadow-none transition-all hover:border-primary/40"
              :class="
                node.data.cronExpression === p.value
                  ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/15 hover:text-primary'
                  : 'bg-accent/5 border-border/40 text-muted-foreground hover:bg-accent/10 hover:text-muted-foreground'
              "
            >
              <span class="text-mini font-bold">{{ p.label }}</span>
              <code class="text-micro font-mono opacity-70">{{ p.value }}</code>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- EVENT -->
    <template v-if="node.data.type === 'event'">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label class="text-mini font-black uppercase tracking-widest text-muted-foreground ml-1">
            Internal Event Name
          </label>
          <input
            :value="node.data.eventName || ''"
            @input="updateNodeData({ eventName: ($event.target as HTMLInputElement).value })"
            placeholder="video.uploaded"
            class="editor-input h-10 font-bold font-mono bg-accent/5 text-yellow-500"
          />
          <p class="text-mini text-muted-foreground italic ml-1">
            This workflow will run whenever an <strong>Emit Event</strong> node or the
            <code class="font-mono">/events/emit</code> API emits this event name.
          </p>
        </div>

        <div class="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
          <p class="text-mini font-black uppercase tracking-widest text-yellow-500 mb-1">
            How it works
          </p>
          <p class="text-mini text-muted-foreground leading-relaxed">
            Use an <strong>Emit Event</strong> node in another workflow to trigger this one. The
            emitted payload will be available in
            <code class="font-mono text-yellow-400" v-pre>{{ trigger.payload }}</code
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
  const path = (props.node.data as any).webhookPath || ''
  return path
    ? `${API_BASE_URL}/webhooks/${path}`
    : `${API_BASE_URL}/webhooks/<auto-assigned-on-save>`
})

const allowedMethods = computed<string[]>(() => {
  return (props.node.data as any).webhookMethods ?? ['POST']
})

const humanCron = computed(() => humanizeCron((props.node.data as any).cronExpression))

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
  const currentSchema = (props.node.data as any).schema || {}
  const newSchema = { ...currentSchema }
  const val = newSchema[oldKey]
  delete newSchema[oldKey]
  newSchema[newKey] = val
  props.updateNodeData({ schema: newSchema })
}

function removeSchemaField(key: string) {
  const currentSchema = (props.node.data as any).schema || {}
  const newSchema = { ...currentSchema }
  delete newSchema[key]
  props.updateNodeData({ schema: newSchema })
}

function updateSchemaField(key: string, updates: any) {
  const currentSchema = (props.node.data as any).schema || {}
  props.updateNodeData({
    schema: {
      ...currentSchema,
      [key]: { ...currentSchema[key], ...updates },
    },
  })
}

function addSchemaField() {
  const currentSchema = (props.node.data as any).schema || {}
  const num = Object.keys(currentSchema).length
  props.updateNodeData({
    schema: {
      ...currentSchema,
      [`field${num}`]: { type: 'string', required: false },
    },
  })
}
</script>
