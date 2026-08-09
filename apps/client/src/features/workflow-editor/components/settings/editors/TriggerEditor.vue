<template>
  <div ref="editorRef" class="editor-stack">
    <!-- ── Trigger Type ── -->
    <EditorField label="Trigger Type">
      <BaseSelect
        :model-value="(node.data.type as string) || 'manual'"
        :options="TRIGGER_OPTIONS"
        @update:model-value="updateNodeData({ type: $event as any })"
      />
    </EditorField>

    <ChatTriggerEditor v-if="node.data.type === 'chat'" v-bind="props" />

    <!-- ── MANUAL ── -->
    <template v-if="node.data.type === 'manual' || !node.data.type">
      <div class="te-section">
        <div class="te-intro">
          <span class="te-label">Expected Manual Inputs</span>
          <p class="te-hint">Fields user must fill when running manually.</p>
        </div>

        <div class="flex flex-col gap-2 mt-2">
          <div
            v-for="(field, key, index) in node.data.schema || {}"
            :key="index"
            class="flex items-center gap-2"
          >
            <BaseInput
              :model-value="String(key)"
              @blur="
                updateSchemaKey(
                  String(key),
                  ($event.target as HTMLInputElement).value,
                )
              "
              placeholder="Field name"
              style="font-family: var(--fabric-font-mono); flex: 1"
            />
            <div style="width: 130px; flex-shrink: 0">
              <BaseSelect
                :model-value="(field as any).type as string"
                :options="MANUAL_FIELD_TYPES"
                @update:model-value="
                  updateSchemaField(String(key), { type: $event as any })
                "
              />
            </div>
            <div style="width: auto; flex-shrink: 0; border: none">
              <BaseInput
                type="checkbox"
                class="te-checkbox"
                :model-value="Boolean((field as any).required)"
                @update:model-value="
                  updateSchemaField(String(key), { required: Boolean($event) })
                "
              />
            </div>
            <label>Req</label>
            <BaseButton
              variant="ghost"
              size="icon"
              icon-left="x"
              class="!text-[var(--fabric-trigger-editor-text-muted)] hover:!text-[var(--fabric-trigger-editor-text-primary)] !p-2"
              @click="removeSchemaField(String(key))"
            />
          </div>

          <BaseButton
            variant="dashed"
            size="md"
            icon-left="plus"
            full-width
            class="!rounded-full mt-1"
            @click="addSchemaField"
          >
            Add Expected Input
          </BaseButton>
        </div>
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
          <BaseVariableInput
            type="text"
            :model-value="
              (node.data as unknown as WorkflowTrigger).webhookSlug || ''
            "
            @update:model-value="
              updateNodeData({ webhookSlug: ($event as string) || undefined })
            "
            placeholder="new-sale"
          />
          <p class="te-hint">
            kebab-case only — replaces the auto-generated path.
          </p>
        </div>

        <!-- URL display — test vs. production -->
        <div class="te-field">
          <span class="te-label">Webhook URLs</span>
          <div class="te-url-group">
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--test">TEST</span>
              <div class="te-url-box">{{ testWebhookUrl }}</div>
              <button
                class="te-icon-btn"
                @click="copyUrl(testWebhookUrl, 'test')"
              >
                <CheckIcon
                  v-if="copied === 'test'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--prod">PROD</span>
              <div class="te-url-box">{{ prodWebhookUrl }}</div>
              <button
                class="te-icon-btn"
                @click="copyUrl(prodWebhookUrl, 'prod')"
              >
                <CheckIcon
                  v-if="copied === 'prod'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
          </div>
          <p class="te-hint">
            Test URL works for any workflow. Prod URL requires publishing.
          </p>
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
            <BaseVariableInput
              type="password"
              :model-value="
                (node.data as unknown as WorkflowTrigger).webhookSecret || ''
              "
              @update:model-value="
                updateNodeData({ webhookSecret: $event as string })
              "
              placeholder="my-secret-key"
            />
            <button
              class="te-icon-btn"
              title="Generate random secret"
              @click="generateSecret"
            >
              <RefreshCwIcon :size="14" />
            </button>
          </div>
          <p class="te-hint">
            Validate requests using
            <code class="editor-code-snippet"
              >X-Fabric-Signature: sha256=…</code
            >
          </p>
        </div>

        <!-- Expected Body Schema -->
        <div class="te-section">
          <div class="te-intro">
            <span class="te-label">Expected Body</span>
            <p class="te-hint">
              Document the fields this webhook expects to receive.
            </p>
          </div>

          <div class="flex flex-col gap-2 mt-2">
            <div
              v-for="(field, key, index) in (
                node.data as unknown as WorkflowTrigger
              ).webhookBodySchema || {}"
              :key="index"
              class="flex items-center gap-2"
            >
              <BaseInput
                :model-value="String(key)"
                @blur="
                  updateBodySchemaKey(
                    String(key),
                    ($event.target as HTMLInputElement).value,
                  )
                "
                placeholder="Field name"
                style="font-family: var(--fabric-font-mono); flex: 1"
              />
              <div style="width: 130px; flex-shrink: 0">
                <BaseSelect
                  :model-value="(field as any).type as string"
                  :options="WEBHOOK_FIELD_TYPES"
                  @update:model-value="
                    updateBodySchemaField(String(key), { type: $event as any })
                  "
                />
              </div>
              <label
                class="flex items-center gap-1.5 text-xs font-medium text-[var(--fabric-trigger-editor-text-secondary)] cursor-pointer whitespace-nowrap px-1"
              >
                <BaseInput
                  type="checkbox"
                  class="te-checkbox"
                  :model-value="Boolean((field as any).required)"
                  @update:model-value="
                    updateBodySchemaField(String(key), {
                      required: Boolean($event),
                    })
                  "
                />
                Req
              </label>
              <BaseButton
                variant="ghost"
                size="icon"
                icon-left="x"
                class="!text-[var(--fabric-trigger-editor-text-muted)] hover:!text-[var(--fabric-trigger-editor-text-primary)] !p-2"
                @click="removeBodySchemaField(String(key))"
              />
            </div>

            <BaseButton
              variant="dashed"
              size="md"
              icon-left="plus"
              full-width
              class="!rounded-full mt-1"
              @click="addBodySchemaField"
            >
              Add Body Field
            </BaseButton>
          </div>
        </div>
      </div>
    </template>

    <!-- ── FORM ── -->
    <template v-if="node.data.type === 'form'">
      <div class="te-section">
        <!-- Form ID -->
        <div class="te-field">
          <span class="te-label">
            Form ID
            <span class="te-label-sub">(optional, readable URL)</span>
          </span>
          <BaseVariableInput
            type="text"
            :model-value="
              (node.data as unknown as WorkflowTrigger).formSlug || ''
            "
            @update:model-value="
              updateNodeData({ formSlug: ($event as string) || undefined })
            "
            placeholder="contact-us"
          />
          <p class="te-hint">
            kebab-case only. Leave empty to use the workflow UUID.
          </p>
        </div>

        <!-- Form URLs -->
        <div class="te-field">
          <span class="te-label">Form URLs</span>
          <div class="te-url-group">
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--test">TEST</span>
              <div class="te-url-box">
                {{ formTestUrl || "<" + "save-workflow-first" + ">" }}
              </div>
              <button
                class="te-icon-btn"
                title="Copy URL"
                :disabled="!formTestUrl"
                @click="copyUrl(formTestUrl, 'form-test')"
              >
                <CheckIcon
                  v-if="copied === 'form-test'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
              <a
                v-if="formTestUrl"
                :href="formTestUrl"
                target="_blank"
                rel="noopener"
                class="te-icon-btn"
                title="Open in new tab"
              >
                <RadioIcon :size="14" />
              </a>
            </div>
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--prod">PROD</span>
              <div class="te-url-box">
                {{ formProdUrl || "<" + "save-workflow-first" + ">" }}
              </div>
              <button
                class="te-icon-btn"
                title="Copy URL"
                :disabled="!formProdUrl"
                @click="copyUrl(formProdUrl, 'form-prod')"
              >
                <CheckIcon
                  v-if="copied === 'form-prod'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
              <a
                v-if="formProdUrl"
                :href="formProdUrl"
                target="_blank"
                rel="noopener"
                class="te-icon-btn"
                title="Open in new tab"
              >
                <RadioIcon :size="14" />
              </a>
            </div>
          </div>
          <p class="te-hint">
            Test URL works through localhost. Prod URL uses the configured
            Public URL.
          </p>
        </div>

        <!-- Form Theme -->
        <FormThemeMenu
          :model-value="formTheme"
          :title="(node.data as unknown as WorkflowTrigger).formTitle || ''"
          :description="
            (node.data as unknown as WorkflowTrigger).formDescription || ''
          "
          @update:model-value="updateNodeData({ formTheme: $event })"
        />

        <!-- Form Title / Description -->
        <div class="te-field">
          <span class="te-label">Form Title</span>
          <BaseVariableInput
            :model-value="
              (node.data as unknown as WorkflowTrigger).formTitle || ''
            "
            @update:model-value="
              updateNodeData({ formTitle: $event as string })
            "
            placeholder="Contact us"
          />
        </div>

        <div class="te-field">
          <span class="te-label">
            Description
            <span class="te-label-sub">(optional)</span>
          </span>
          <BaseVariableInput
            :model-value="
              (node.data as unknown as WorkflowTrigger).formDescription || ''
            "
            @update:model-value="
              updateNodeData({ formDescription: $event as string })
            "
            placeholder="We'll get back within 24h"
          />
        </div>

        <FormFieldsEditor
          :model-value="formFields"
          hint="Each field is delivered to the workflow as <code class='editor-code-snippet'>{{ trigger.fields.&lt;name&gt; }}</code>."
          @update:model-value="saveFormFields"
        />
      </div>
    </template>

    <!-- ── CRON ── -->
    <template v-if="node.data.type === 'cron'">
      <div class="te-section">
        <div class="te-field">
          <span class="te-label">Cron Expression</span>
          <BaseVariableInput
            :model-value="
              (node.data as unknown as WorkflowTrigger).cronExpression || ''
            "
            @update:model-value="
              updateNodeData({ cronExpression: $event as string })
            "
            placeholder="* * * * *"
            style="font-family: var(--fabric-font-mono)"
          />
          <p v-if="humanCron" class="te-human-cron">↳ {{ humanCron }}</p>
          <div class="te-info-blue">
            Format: <code class="font-mono">minute hour day month weekday</code
            ><br />
            Example: <code class="font-mono">0 9 * * 1-5</code> (Mon–Fri at 9:00
            AM)
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
              :class="{
                'te-preset-btn--active':
                  (node.data as unknown as WorkflowTrigger).cronExpression ===
                  p.value,
              }"
            >
              <span class="te-preset-label">{{ p.label }}</span>
              <code class="te-preset-value">{{ p.value }}</code>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── PLUGIN TRIGGER ── -->
    <template
      v-if="(node.data as unknown as WorkflowTrigger).type === 'plugin'"
    >
      <div class="te-section">
        <!-- Plugin Selector -->
        <div class="te-field">
          <span class="te-label">Integration</span>
          <BaseSelect
            :model-value="
              (node.data as unknown as WorkflowTrigger).pluginId || ''
            "
            :options="pluginTriggerOptions"
            @update:model-value="onPluginChange($event as string)"
          />
          <p class="te-hint">Only plugins that support triggers are listed.</p>
        </div>

        <!-- Trigger Name Selector -->
        <div
          class="te-field"
          v-if="selectedPlugin && availableTriggers.length > 0"
        >
          <span class="te-label">Event / Trigger</span>
          <BaseSelect
            :model-value="
              (node.data as unknown as WorkflowTrigger).triggerName || ''
            "
            :options="availableTriggers"
            @update:model-value="
              updateNodeData({ triggerName: $event as string })
            "
          />
        </div>

        <!-- Endpoint Slug -->
        <div
          class="te-field"
          v-if="(node.data as unknown as WorkflowTrigger).pluginId"
        >
          <span class="te-label">
            Endpoint Slug
            <span class="te-label-sub">(optional, readable name)</span>
          </span>
          <BaseVariableInput
            type="text"
            :model-value="
              (node.data as unknown as WorkflowTrigger).webhookSlug || ''
            "
            @update:model-value="
              updateNodeData({ webhookSlug: ($event as string) || undefined })
            "
            placeholder="new-sale"
          />
          <p class="te-hint">
            kebab-case only — replaces the auto-generated path.
          </p>
        </div>

        <!-- URL display — test vs. production -->
        <div
          class="te-field"
          v-if="(node.data as unknown as WorkflowTrigger).pluginId"
        >
          <span class="te-label">Webhook URLs</span>
          <div class="te-url-group">
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--test">TEST</span>
              <div class="te-url-box">{{ testWebhookUrl }}</div>
              <button
                class="te-icon-btn"
                @click="copyUrl(testWebhookUrl, 'test')"
              >
                <CheckIcon
                  v-if="copied === 'test'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
            <div class="te-url-row">
              <span class="te-url-badge te-url-badge--prod">PROD</span>
              <div class="te-url-box">{{ prodWebhookUrl }}</div>
              <button
                class="te-icon-btn"
                @click="copyUrl(prodWebhookUrl, 'prod')"
              >
                <CheckIcon
                  v-if="copied === 'prod'"
                  :size="14"
                  style="color: var(--fabric-trigger-editor-green400)"
                />
                <CopyIcon v-else :size="14" />
              </button>
            </div>
          </div>
          <p class="te-hint">
            Test URL works for any workflow. Prod URL requires publishing.
          </p>
        </div>

        <!-- Trigger Params -->
        <template v-if="selectedTriggerManifest?.parameters?.properties">
          <div class="te-section" style="padding-top: 0">
            <div class="te-intro">
              <span class="te-label">Trigger Settings</span>
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(propSchema, propKey) in selectedTriggerManifest
                  .parameters.properties"
                :key="String(propKey)"
                class="te-field"
              >
                <span class="te-label">{{
                  propSchema["x-label"] || propKey
                }}</span>
                <p v-if="propSchema.description" class="te-hint">
                  {{ propSchema.description }}
                </p>
                <div class="te-variable-field">
                  <BaseVariableInput
                    :field-type="triggerParamFieldType(propSchema)"
                    :placeholder="triggerParamPlaceholder(propSchema)"
                    :rows="
                      triggerParamFieldType(propSchema) === 'textarea'
                        ? 3
                        : undefined
                    "
                    :model-value="
                      String(
                        (node.data as unknown as WorkflowTrigger)
                          .triggerParams?.[String(propKey)] ?? '',
                      )
                    "
                    @update:model-value="
                      updateTriggerParam(String(propKey), $event as string)
                    "
                    @focus="
                      rememberTriggerParamSelection(String(propKey), $event)
                    "
                    @keyup="
                      rememberTriggerParamSelection(String(propKey), $event)
                    "
                    @mouseup="
                      rememberTriggerParamSelection(String(propKey), $event)
                    "
                    @click="
                      rememberTriggerParamSelection(String(propKey), $event)
                    "
                    @variable-click="
                      toggleTriggerParamPicker(String(propKey), $event)
                    "
                  />

                  <RenderPortal>
                    <div
                      v-if="activeTriggerParamPicker === String(propKey)"
                      ref="pickerRef"
                      class="te-variable-picker-popover"
                      :style="pickerStyle"
                    >
                      <VariablePicker
                        @select="
                          selectTriggerParamVariable(String(propKey), $event)
                        "
                      />
                    </div>
                  </RenderPortal>
                </div>
                <p v-if="triggerParamHint(propSchema)" class="te-hint">
                  {{ triggerParamHint(propSchema) }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Listen for Event Button (Teleported to Output Header) -->
        <Teleport
          to="#listen-button-container"
          v-if="isMounted && (node.data as unknown as WorkflowTrigger).pluginId"
        >
          <button
            v-if="listenState === 'idle'"
            class="te-listen-btn"
            style="
              padding: 4px 8px;
              font-size: 11px;
              width: auto;
              height: auto;
              border-radius: var(--fabric-radius-sm);
            "
            @click="startListening"
          >
            <RadioIcon :size="12" />
            Listen for Event
          </button>

          <BaseButton
            v-else-if="listenState === 'listening'"
            variant="secondary"
            size="sm"
            class="!text-fabric-accent"
            loading
            @click="cancelListening"
          >
            Waiting ({{ listenCountdown }}s) - Cancel
          </BaseButton>

          <BaseButton
            v-else-if="listenState === 'captured'"
            variant="ghost"
            size="sm"
            style="color: var(--fabric-trigger-editor-green400)"
            icon-left="check-circle"
            @click="listenState = 'idle'"
          >
            Captured!
          </BaseButton>

          <BaseButton
            v-else-if="listenState === 'timeout'"
            variant="ghost"
            size="sm"
            class="text-red-500"
            icon-left="clock"
            @click="listenState = 'idle'"
          >
            Timeout - Dismiss
          </BaseButton>
        </Teleport>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import {
  XIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  RadioIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-vue-next";
import type { NodeEditorProps } from "./types";
import type {
  WorkflowTrigger,
  WorkflowSchemaField,
  WebhookBodyField,
  FormTriggerField,
  FormTheme,
} from "@/core/types/workflow.types";
import type {
  PluginSummary,
  PluginTriggerManifest,
} from "@/core/types/plugin.types";
import EditorField from "./EditorField.vue";
import BaseSelect from "@/shared/components/base/BaseSelect.vue";
import BaseInput from "@/shared/components/base/BaseInput.vue";
import BaseVariableInput from "@/shared/components/base/BaseVariableInput.vue";
import BaseButton from "@/shared/components/base/BaseButton.vue";
import FormThemeMenu from "../../form/FormThemeMenu.vue";
import FormFieldsEditor from "../../form/FormFieldsEditor.vue";
import ChatTriggerEditor from "./ChatTriggerEditor.vue";
import VariablePicker from "../expressions/VariablePicker.vue";
import { API_BASE_URL } from "@/core/constants/app";
import { pluginsApi } from "@/core/api/plugins.api";
import { workflowsApi } from "@/core/api/workflows.api";
import { appApi } from "@/core/api/app.api";
import { useWorkflowStore } from "../../../stores/workflow.store";
import { useProfileStore } from "@/shared/stores/profile.store";
import { useToast } from "@/shared/composables/useToast";
import { onMounted } from "vue";
import {
  buildTriggerFormProdUrl,
  buildTriggerFormTestUrl,
  buildTriggerWebhookProdUrl,
} from "./triggerRuntimeUrls";
import type {
  ExpressionItem,
  TextSelectionRange,
} from "../expressions/expressionVariables";
import { insertExpressionToken } from "../expressions/expressionVariables";
import { useVariablePickerPosition } from "../expressions/useVariablePickerPosition";
import { RenderPortal, ownerDocumentOf } from "@renderizer/vue";

const props = defineProps<NodeEditorProps>();
const workflowStore = useWorkflowStore();
const profileStore = useProfileStore();
const toast = useToast();
const editorRef = ref<HTMLElement | null>(null);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});

const TRIGGER_OPTIONS = [
  { value: "manual", label: "Manual", icon: "hand" },
  { value: "webhook", label: "Webhook", icon: "globe" },
  { value: "form", label: "Form", icon: "file-text" },
  { value: "cron", label: "Cron / Schedule", icon: "clock" },
  { value: "plugin", label: "Plugin Trigger", icon: "plug" },
  { value: "chat", label: "Chat", icon: "message-circle" },
];

const MANUAL_FIELD_TYPES = [
  { value: "string", label: "String", icon: "type" },
  { value: "number", label: "Number", icon: "hash" },
  { value: "file", label: "File", icon: "file" },
];

const WEBHOOK_FIELD_TYPES = [
  { value: "string", label: "String", icon: "type" },
  { value: "number", label: "Number", icon: "hash" },
  { value: "boolean", label: "Boolean", icon: "toggle-left" },
  { value: "object", label: "Object", icon: "braces" },
  { value: "array", label: "Array", icon: "list" },
];

const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at 9 AM", value: "0 9 * * *" },
  { label: "Every Mon–Fri at 9 AM", value: "0 9 * * 1-5" },
  { label: "Every Sunday at noon", value: "0 12 * * 0" },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

function humanizeCron(expression: string | undefined): string {
  if (!expression) return "";
  try {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return "Invalid expression";
    const [min, hour, dom, month, dow] = parts;
    if (
      min === "*" &&
      hour === "*" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every minute";
    if (
      min === "0" &&
      hour === "*" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every hour at minute 0";
    if (
      min === "0" &&
      hour === "0" &&
      dom === "*" &&
      month === "*" &&
      dow === "*"
    )
      return "Every day at midnight";
    if (dom === "*" && month === "*" && dow === "*")
      return `Every day at ${hour?.padStart(2, "0")}:${min?.padStart(2, "0")}`;
    if (dom === "*" && month === "*" && dow !== "*")
      return `On day(s) ${dow} at ${hour?.padStart(2, "0")}:${min?.padStart(2, "0")}`;
    return expression;
  } catch {
    return "";
  }
}

const copied = ref<"test" | "prod" | "form-test" | "form-prod" | null>(null);

const backendPublicUrl = ref(API_BASE_URL);

async function loadAppInfo() {
  try {
    const info = await appApi.getInfo();
    if (info.publicUrl) {
      backendPublicUrl.value = info.publicUrl;
    }
  } catch (err) {
    // fallback to API_BASE_URL silently
  }
}
loadAppInfo();

function resolvedPath(): string {
  const trigger = props.node.data as unknown as WorkflowTrigger;
  return (
    trigger.webhookSlug || trigger.webhookPath || "<auto-assigned-on-save>"
  );
}

const testWebhookUrl = computed(
  () => `${API_BASE_URL}/webhook-test/${resolvedPath()}`,
);
const currentProfileId = computed(() => profileStore.currentProfile?.id);
const prodWebhookUrl = computed(() =>
  buildTriggerWebhookProdUrl(
    backendPublicUrl.value,
    resolvedPath(),
    currentProfileId.value,
  ),
);

const allowedMethods = computed<string[]>(() => {
  return (
    (props.node.data as unknown as WorkflowTrigger).webhookMethods ?? ["POST"]
  );
});

const humanCron = computed(() =>
  humanizeCron((props.node.data as unknown as WorkflowTrigger).cronExpression),
);

function toggleMethod(method: string) {
  const current = allowedMethods.value;
  if (current.includes(method)) {
    const next = current.filter((m) => m !== method);
    props.updateNodeData({ webhookMethods: next.length ? next : ["POST"] });
  } else {
    props.updateNodeData({ webhookMethods: [...current, method] });
  }
}

async function copyUrl(
  url: string,
  which: "test" | "prod" | "form-test" | "form-prod",
) {
  await navigator.clipboard.writeText(url);
  copied.value = which;
  setTimeout(() => {
    copied.value = null;
  }, 2000);
}

function generateSecret() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const secret = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  props.updateNodeData({ webhookSecret: secret });
}

// ── Manual schema helpers ──────────────────────────────────

function updateSchemaKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return;
  const currentSchema =
    (props.node.data as unknown as WorkflowTrigger).schema || {};
  const newSchema = { ...currentSchema };
  const val = newSchema[oldKey];
  delete newSchema[oldKey];
  if (val) newSchema[newKey] = val;
  props.updateNodeData({ schema: newSchema });
}

function removeSchemaField(key: string) {
  const currentSchema =
    (props.node.data as unknown as WorkflowTrigger).schema || {};
  const newSchema = { ...currentSchema };
  delete newSchema[key];
  props.updateNodeData({ schema: newSchema });
}

function updateSchemaField(key: string, updates: Partial<WorkflowSchemaField>) {
  const currentSchema =
    (props.node.data as unknown as WorkflowTrigger).schema || {};
  props.updateNodeData({
    schema: { ...currentSchema, [key]: { ...currentSchema[key], ...updates } },
  });
}

function addSchemaField() {
  const currentSchema =
    (props.node.data as unknown as WorkflowTrigger).schema || {};
  const num = Object.keys(currentSchema).length;
  props.updateNodeData({
    schema: {
      ...currentSchema,
      [`field${num}`]: { type: "string", required: false },
    },
  });
}

// ── Webhook body schema helpers ────────────────────────────

function updateBodySchemaKey(oldKey: string, newKey: string) {
  if (oldKey === newKey) return;
  const schema =
    (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {};
  const next = { ...schema };
  const val = next[oldKey];
  delete next[oldKey];
  if (val) next[newKey] = val;
  props.updateNodeData({ webhookBodySchema: next });
}

function removeBodySchemaField(key: string) {
  const schema =
    (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {};
  const next = { ...schema };
  delete next[key];
  props.updateNodeData({ webhookBodySchema: next });
}

function updateBodySchemaField(
  key: string,
  updates: Partial<WebhookBodyField>,
) {
  const schema =
    (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {};
  props.updateNodeData({
    webhookBodySchema: { ...schema, [key]: { ...schema[key], ...updates } },
  });
}

function addBodySchemaField() {
  const schema =
    (props.node.data as unknown as WorkflowTrigger).webhookBodySchema || {};
  const num = Object.keys(schema).length;
  props.updateNodeData({
    webhookBodySchema: {
      ...schema,
      [`field${num}`]: { type: "string", required: false },
    },
  });
}

// ── Form Trigger helpers ───────────────────────────────────

const formFields = computed<FormTriggerField[]>(
  () => (props.node.data as unknown as WorkflowTrigger).formFields ?? [],
);

const formTheme = computed<FormTheme>(
  () => (props.node.data as unknown as WorkflowTrigger).formTheme ?? {},
);

const formPublicId = computed(() => {
  const id = workflowStore.activeWorkflow?.metadata.id;
  const slug = (props.node.data as unknown as WorkflowTrigger).formSlug?.trim();
  return slug || id || "";
});

// For TEST: use the local backend URL (same as testWebhookUrl pattern — server redirects to local SPA)
// For PROD: use the public backend URL (server renders/redirects via public client URL)
const formTestUrl = computed(() =>
  buildTriggerFormTestUrl(API_BASE_URL, formPublicId.value),
);
const formProdUrl = computed(() =>
  buildTriggerFormProdUrl(
    backendPublicUrl.value,
    formPublicId.value,
    currentProfileId.value,
  ),
);

function saveFormFields(next: FormTriggerField[]) {
  props.updateNodeData({ formFields: next });
}

// ── Plugin Trigger ──────────────────────────────────────────

const allPlugins = ref<PluginSummary[]>([]);
const activeTriggerParamPicker = ref<string | null>(null);
const activeTriggerParamAnchor = ref<HTMLElement | null>(null);
const triggerParamSelections = ref<Record<string, TextSelectionRange>>({});
const {
  pickerRef,
  pickerStyle,
  preparePickerPosition,
  removePickerPositionListeners,
} = useVariablePickerPosition(activeTriggerParamAnchor);

// Fetch plugins lazily when the trigger type is "plugin"
async function loadPlugins() {
  if (allPlugins.value.length === 0) {
    try {
      allPlugins.value = await pluginsApi.getAll();
    } catch {
      /* fail silently */
    }
  }
}
loadPlugins();

// Only plugins that expose at least one trigger
const pluginsWithTriggers = computed(() =>
  allPlugins.value.filter(
    (p) => p.manifest.triggers && Object.keys(p.manifest.triggers).length > 0,
  ),
);

const pluginTriggerOptions = computed(() =>
  pluginsWithTriggers.value.map((p) => {
    const iconStr = p.manifest.metadata.icon;
    const isImage =
      iconStr &&
      (iconStr.startsWith("http") ||
        iconStr.startsWith("/") ||
        iconStr.startsWith("data:"));
    return {
      value: p.id,
      label: p.manifest.metadata.name,
      ...(isImage ? { image: iconStr } : { icon: iconStr || "plug" }),
    };
  }),
);

const selectedPlugin = computed(() =>
  allPlugins.value.find(
    (p) => p.id === (props.node.data as unknown as WorkflowTrigger).pluginId,
  ),
);

const availableTriggers = computed(() => {
  const triggers = selectedPlugin.value?.manifest.triggers;
  if (!triggers) return [];
  return Object.entries(triggers).map(([key, t]) => ({
    value: key,
    label: t.metadata.label,
    icon: "zap",
  }));
});

const selectedTriggerManifest = computed((): PluginTriggerManifest | null => {
  const trigger = props.node.data as unknown as WorkflowTrigger;
  if (!trigger.triggerName || !selectedPlugin.value) return null;
  return selectedPlugin.value.manifest.triggers?.[trigger.triggerName] ?? null;
});

function onPluginChange(pluginId: string) {
  props.updateNodeData({ pluginId, triggerName: undefined, triggerParams: {} });
}

function updateTriggerParam(key: string, value: string) {
  const current =
    (props.node.data as unknown as WorkflowTrigger).triggerParams ?? {};
  props.updateNodeData({ triggerParams: { ...current, [key]: value } });
}

function rememberTriggerParamSelection(key: string, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
  const fallback = String(
    (props.node.data as unknown as WorkflowTrigger).triggerParams?.[key] ?? "",
  ).length;
  if (!target || typeof target.selectionStart !== "number") {
    triggerParamSelections.value = {
      ...triggerParamSelections.value,
      [key]: { start: fallback, end: fallback },
    };
    return;
  }

  triggerParamSelections.value = {
    ...triggerParamSelections.value,
    [key]: {
      start: target.selectionStart ?? fallback,
      end: target.selectionEnd ?? target.selectionStart ?? fallback,
    },
  };
}

function closeTriggerParamPicker() {
  const ownerDocument = ownerDocumentOf(
    activeTriggerParamAnchor.value ?? editorRef.value,
  );
  activeTriggerParamPicker.value = null;
  activeTriggerParamAnchor.value = null;
  ownerDocument.removeEventListener(
    "pointerdown",
    onTriggerParamDocumentPointerDown,
    true,
  );
  removePickerPositionListeners();
}

function onTriggerParamDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (
    !activeTriggerParamAnchor.value?.contains(target) &&
    !pickerRef.value?.contains(target)
  ) {
    closeTriggerParamPicker();
  }
}

async function toggleTriggerParamPicker(key: string, event: MouseEvent) {
  if (activeTriggerParamPicker.value === key) {
    closeTriggerParamPicker();
    return;
  }

  activeTriggerParamPicker.value = key;
  activeTriggerParamAnchor.value = (
    event.currentTarget as HTMLElement | null
  )?.closest(".te-variable-field") as HTMLElement | null;
  ownerDocumentOf(
    activeTriggerParamAnchor.value ?? editorRef.value,
  ).addEventListener("pointerdown", onTriggerParamDocumentPointerDown, true);
  await preparePickerPosition();
}

function selectTriggerParamVariable(key: string, item: ExpressionItem) {
  const current = String(
    (props.node.data as unknown as WorkflowTrigger).triggerParams?.[key] ?? "",
  );
  const next = insertExpressionToken(
    current,
    item.token,
    triggerParamSelections.value[key],
  );
  updateTriggerParam(key, next);
  closeTriggerParamPicker();
}

function triggerParamFieldType(
  propSchema: Record<string, any>,
): "input" | "textarea" {
  const inputType = propSchema["x-input-type"];
  return inputType === "textarea" ||
    inputType === "json" ||
    inputType === "code"
    ? "textarea"
    : "input";
}

function triggerParamPlaceholder(propSchema: Record<string, any>): string {
  if (typeof propSchema.placeholder === "string") return propSchema.placeholder;
  if (Array.isArray(propSchema.enum) && propSchema.enum.length > 0)
    return propSchema.enum.map(String).join(" | ");
  if (propSchema.type === "boolean") return "true or false";
  if (propSchema.type === "integer" || propSchema.type === "number")
    return "number or {{ variable }}";
  return "{{ variable }} or value";
}

function triggerParamHint(propSchema: Record<string, any>): string {
  if (Array.isArray(propSchema.enum) && propSchema.enum.length > 0) {
    return `Allowed values: ${propSchema.enum.map(String).join(", ")}. Variables are also supported.`;
  }
  if (propSchema.type === "boolean") {
    return "Use true/false, or insert a variable that resolves to a boolean.";
  }
  return "";
}

// ── Listen for Event state machine ────────────────────────────

type ListenState = "idle" | "listening" | "captured" | "timeout";
const listenState = ref<ListenState>("idle");
const listenCountdown = ref(120);

let _listenEs: EventSource | null = null;
let _countdownInterval: ReturnType<typeof setInterval> | null = null;

function startListening() {
  const workflowId = workflowStore.activeWorkflow?.metadata.id;
  if (!workflowId) return;

  listenState.value = "listening";
  listenCountdown.value = 120;

  _countdownInterval = setInterval(() => {
    listenCountdown.value--;
    if (listenCountdown.value <= 0) {
      clearInterval(_countdownInterval!);
      _countdownInterval = null;
    }
  }, 1000);

  _listenEs = workflowsApi.listenForTrigger(workflowId, props.node.id);

  _listenEs.onmessage = (rawEvt: MessageEvent) => {
    try {
      const ev = JSON.parse(rawEvt.data as string) as {
        type: string;
        payload?: Record<string, any>;
        message?: string;
      };

      if (ev.type === "error") {
        toast.error(`Plugin setup failed: ${ev.message}`);
        listenState.value = "idle";
        cleanup();
      } else if (ev.type === "captured" && ev.payload) {
        listenState.value = "captured";
        props.updateNodeData({ lastTriggerPayload: ev.payload });
        cleanup();
      } else if (ev.type === "timeout") {
        listenState.value = "timeout";
        cleanup();
      }
    } catch {
      /* ignore malformed */
    }
  };

  _listenEs.onerror = () => {
    if (listenState.value === "listening") {
      listenState.value = "idle";
    }
    cleanup();
  };
}

function cancelListening() {
  listenState.value = "idle";
  cleanup();
}

function cleanup() {
  if (_listenEs) {
    _listenEs.close();
    _listenEs = null;
  }
  if (_countdownInterval) {
    clearInterval(_countdownInterval);
    _countdownInterval = null;
  }
}

onUnmounted(() => {
  cleanup();
  closeTriggerParamPicker();
});
</script>

<style scoped>
.te-form-field-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--fabric-trigger-editor-border-subtle);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-trigger-editor-bg-surface);
}

.te-form-field-grid {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr)
    minmax(140px, 1fr)
    minmax(150px, 0.85fr)
    minmax(160px, 1fr)
    auto;
  gap: 8px;
  align-items: center;
}

.te-form-field-options {
  width: 100%;
}

.te-form-field-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  white-space: nowrap;
}

.te-form-field-required-label {
  color: var(--fabric-trigger-editor-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .te-form-field-grid {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

.te-checkbox :deep(.base-input-container) {
  width: 14px;
  height: 14px;
  border: 0;
  background: transparent;
}

.te-checkbox :deep(.base-input) {
  width: 14px;
  height: 14px;
  padding: 0;
  accent-color: var(--fabric-trigger-editor-accent);
  cursor: pointer;
}

.te-variable-field {
  position: relative;
  width: 100%;
}

.te-variable-picker-popover {
  z-index: 10030;
}

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
  border-radius: var(--fabric-radius-sm);
  flex-shrink: 0;
}

.te-url-badge--test {
  background: var(--fabric-trigger-editor-bg-muted);
  color: var(--fabric-trigger-editor-text-secondary);
}

.te-url-badge--prod {
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-green400) 15%,
    transparent
  );
  color: var(--fabric-trigger-editor-green400);
}

/* ── Listen for Event ───────────────────────── */
.te-listen-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--fabric-radius-md);
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-accent) 12%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--fabric-trigger-editor-accent) 35%, transparent);
  color: var(--fabric-trigger-editor-accent);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}
.te-listen-btn:hover {
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-accent) 22%,
    transparent
  );
}

.te-listen-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--fabric-radius-md);
  font-size: 12px;
  font-weight: 500;
}

.te-listen-status--listening {
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-amber400) 10%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--fabric-trigger-editor-amber400) 30%, transparent);
  color: var(--fabric-trigger-editor-amber400);
}

.te-listen-status--captured {
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-green400) 10%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--fabric-trigger-editor-green400) 30%, transparent);
  color: var(--fabric-trigger-editor-green400);
}

.te-listen-status--timeout {
  background: color-mix(
    in srgb,
    var(--fabric-trigger-editor-text-muted) 8%,
    transparent
  );
  border: 1px solid var(--fabric-trigger-editor-border-subtle);
  color: var(--fabric-trigger-editor-text-muted);
}

.te-listen-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fabric-trigger-editor-amber400);
  flex-shrink: 0;
  animation: te-pulse 1.2s ease-in-out infinite;
}

@keyframes te-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
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
  border-radius: var(--fabric-radius-sm);
  transition: opacity 0.15s;
}
.te-listen-cancel:hover {
  opacity: 1;
}
</style>
