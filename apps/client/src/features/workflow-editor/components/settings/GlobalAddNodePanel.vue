<template>
  <div
    ref="panelRef"
    class="global-add-node-panel"
    @click.capture="preventClickAfterDrag"
  >
    <Transition name="global-add-node-view" mode="out-in">
      <div
        v-if="selectedPlugin || vectorStoreProviderPickerOpen"
        :key="selectedPlugin?.id ?? 'vector-store-provider-picker'"
        class="global-add-node-panel__method-view"
      >
        <header class="global-add-node-panel__method-header">
          <BaseButton
            icon-left="chevron-left"
            variant="ghost"
            size="icon"
            @click="closePluginMethodView"
          />
          <BaseInput
            ref="methodSearchInput"
            v-model="methodSearch"
            icon-left="search"
            :placeholder="
              selectedPlugin
                ? `Search ${selectedPlugin.manifest.metadata.name}...`
                : 'Search Vector Store...'
            "
          />
        </header>

        <div v-if="selectedPlugin" class="global-add-node-panel__method-title">
          <span
            class="global-add-node-panel__icon"
            :style="pluginStyle(selectedPlugin)"
          >
            <LucideIcon :name="pluginIcon(selectedPlugin)" :size="15" />
          </span>
          <span>{{ selectedPlugin.manifest.metadata.name }}</span>
        </div>
        <div v-else class="global-add-node-panel__method-title">
          <span class="global-add-node-panel__icon">
            <LucideIcon name="database-zap" :size="15" />
          </span>
          <span>Vector Store</span>
        </div>

        <div class="global-add-node-panel__method-list">
          <template v-if="selectedPlugin">
            <button
              v-for="action in filteredSelectedPluginActions"
              :key="action.id"
              class="global-add-node-panel__method-item"
              type="button"
              @click="addSelectedPluginAction(action)"
              @pointerdown="handleSelectedPluginActionDragStart($event, action)"
            >
              <span class="global-add-node-panel__method-icon">
                <LucideIcon name="workflow" :size="15" />
              </span>
              <span class="global-add-node-panel__method-body">
                <span>{{ action.label }}</span>
                <small>{{ action.description }}</small>
              </span>
            </button>
            <div
              v-if="filteredSelectedPluginActions.length === 0"
              class="global-add-node-panel__empty"
            >
              No methods found.
            </div>
          </template>
          <template v-else>
            <button
              v-for="item in filteredVectorStoreProviderItems"
              :key="item.id"
              class="global-add-node-panel__method-item"
              type="button"
              @click="addVectorStoreNodeAtCenter(item.plugin)"
              @pointerdown="
                handlePointerDragStart($event, {
                  kind: 'logic',
                  nodeType: 'vector-store',
                  defaults: vectorStoreDefaults(item.plugin),
                  preview: {
                    icon: pluginIcon(item.plugin),
                    label: item.label,
                    subtitle: 'Vector Store',
                  },
                })
              "
            >
              <span
                class="global-add-node-panel__method-icon"
                :style="pluginStyle(item.plugin)"
              >
                <LucideIcon :name="pluginIcon(item.plugin)" :size="15" />
              </span>
              <span class="global-add-node-panel__method-body">
                <span>{{ item.label }}</span>
                <small>{{ item.description }}</small>
              </span>
            </button>
            <div
              v-if="filteredVectorStoreProviderItems.length === 0"
              class="global-add-node-panel__empty"
            >
              No vector store providers found.
            </div>
          </template>
        </div>
      </div>

      <div v-else key="sections" class="global-add-node-panel__browse-view">
        <div class="global-add-node-panel__toolbar">
          <BaseInput
            ref="searchInput"
            v-model="search"
            icon-left="search"
            placeholder="Search nodes..."
          />
        </div>

        <div v-if="isLoading" class="global-add-node-panel__loading">
          <LucideIcon
            name="loader-2"
            :size="18"
            class="global-add-node-panel__spinner"
          />
          <span>Loading nodes...</span>
        </div>

        <div v-else class="global-add-node-panel__sections">
          <section class="global-add-node-panel__section">
            <button
              class="global-add-node-panel__section-header"
              type="button"
              @click="utilitiesOpen = !utilitiesOpen"
            >
              <span class="global-add-node-panel__section-label">
                <LucideIcon name="wrench" :size="15" />
                <span>Utilities</span>
              </span>
              <LucideIcon
                :name="utilitiesOpen ? 'chevron-up' : 'chevron-down'"
                :size="14"
              />
            </button>
            <Transition name="global-add-node-section">
              <div v-if="utilitiesOpen" class="global-add-node-panel__grid">
                <button
                  v-for="item in utilityItems"
                  :key="item.id"
                  class="global-add-node-panel__item"
                  type="button"
                  @click="selectUtilityItem(item)"
                  @pointerdown="handleUtilityPointerDragStart($event, item)"
                >
                  <span
                    class="global-add-node-panel__icon"
                    :style="
                      item.style
                        ? {
                            '--node-icon-bg': item.style.bgColor,
                            '--node-icon-border': item.style.borderColor,
                            '--node-icon-color': item.style.iconColor,
                          }
                        : undefined
                    "
                  >
                    <LucideIcon :name="item.icon" :size="15" />
                  </span>
                  <span>{{ item.label }}</span>
                  <span
                    v-if="item.nodeType === 'vector-store'"
                    class="global-add-node-panel__method-more"
                  >
                    <LucideIcon name="plus" :size="14" />
                  </span>
                </button>
                <button
                  v-for="plugin in utilityPluginItems"
                  :key="plugin.id"
                  class="global-add-node-panel__item"
                  type="button"
                  @click="selectPlugin(plugin)"
                  @pointerdown="handlePluginPointerDragStart($event, plugin)"
                >
                  <span
                    class="global-add-node-panel__icon"
                    :style="pluginStyle(plugin)"
                  >
                    <LucideIcon :name="pluginIcon(plugin)" :size="15" />
                  </span>
                  <span>{{ plugin.manifest.metadata.name }}</span>
                  <span
                    v-if="pluginNeedsMethodSubmenu(plugin)"
                    class="global-add-node-panel__method-more"
                  >
                    <LucideIcon name="plus" :size="14" />
                  </span>
                </button>
                <div
                  v-if="
                    utilityItems.length === 0 && utilityPluginItems.length === 0
                  "
                  class="global-add-node-panel__empty"
                >
                  No utilities found.
                </div>
              </div>
            </Transition>
          </section>

          <section class="global-add-node-panel__section">
            <button
              class="global-add-node-panel__section-header"
              type="button"
              @click="integrationsOpen = !integrationsOpen"
            >
              <span class="global-add-node-panel__section-label">
                <LucideIcon name="puzzle" :size="15" />
                <span>Integrations</span>
              </span>
              <LucideIcon
                :name="integrationsOpen ? 'chevron-up' : 'chevron-down'"
                :size="14"
              />
            </button>
            <Transition name="global-add-node-section">
              <div v-if="integrationsOpen" class="global-add-node-panel__grid">
                <button
                  v-for="plugin in integrationItems"
                  :key="plugin.id"
                  class="global-add-node-panel__item"
                  type="button"
                  @click="selectPlugin(plugin)"
                  @pointerdown="handlePluginPointerDragStart($event, plugin)"
                >
                  <span
                    class="global-add-node-panel__icon"
                    :style="pluginStyle(plugin)"
                  >
                    <LucideIcon :name="pluginIcon(plugin)" :size="15" />
                  </span>
                  <span>{{ plugin.manifest.metadata.name }}</span>
                  <span
                    v-if="pluginNeedsMethodSubmenu(plugin)"
                    class="global-add-node-panel__method-more"
                  >
                    <LucideIcon name="plus" :size="14" />
                  </span>
                </button>
                <div
                  v-if="integrationItems.length === 0"
                  class="global-add-node-panel__empty"
                >
                  No integrations found.
                </div>
              </div>
            </Transition>
          </section>
        </div>
      </div>
    </Transition>

    <RenderPortal>
      <div
        v-if="dragPreview"
        class="global-add-node-drag-preview"
        :style="dragPreviewStyle"
      >
        <div
          class="global-add-node-drag-preview__body"
          :style="dragPreviewBodyStyle"
        >
          <div class="global-add-node-drag-preview__node">
            <span class="global-add-node-drag-preview__icon">
              <LucideIcon :name="dragPreview.icon" :size="28" />
            </span>
          </div>
          <div class="global-add-node-drag-preview__label">
            {{ dragPreview.label }}
          </div>
          <div class="global-add-node-drag-preview__subtitle">
            {{ dragPreview.subtitle }}
          </div>
        </div>
      </div>
    </RenderPortal>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { pluginsApi } from "@/core/api/plugins.api";
import { workflowNodesApi } from "@/core/api/workflowNodes.api";
import type { PluginSummary } from "@/core/types/plugin.types";
import type { WorkflowNodeType } from "@/core/types/workflow.types";
import BaseButton from "@/shared/components/base/BaseButton.vue";
import BaseInput from "@/shared/components/base/BaseInput.vue";
import { useApi } from "@/shared/composables/useApi";
import { RenderPortal, ownerDocumentOf, ownerWindowOf } from "@renderizer/vue";
import { useTheme } from "@/shared/composables/useTheme";
import LucideIcon from "@/shared/icons/LucideIcon.vue";
import { resolvePluginIcon } from "@/shared/icons/pluginIconResolver";
import { replaceNodeDefinitions } from "../../catalog/nodeDefinitionRegistry";
import {
  buildVectorStoreProviderItems,
  buildPickerActionItems,
  catalogItemsToPickerPresets,
  filterDefaultPickerPresets,
  type AddNodePickerActionItem,
  type AddNodePickerPreset,
} from "./addNodePickerModel";

type GlobalAddNodeDragPayload =
  | {
      kind: "logic";
      nodeType: WorkflowNodeType;
      defaults?: Record<string, unknown>;
      preview?: DragPreviewMeta;
    }
  | {
      kind: "plugin";
      pluginId: string;
      action: string;
      actionName: string;
      preview?: DragPreviewMeta;
    };

interface DragPreviewMeta {
  icon: string;
  label: string;
  subtitle: string;
}

const props = defineProps<{
  onAddLogicNodeAtCenter?: (
    type: WorkflowNodeType,
    defaults?: Record<string, unknown>,
  ) => void;
  onAddPluginNodeAtCenter?: (
    pluginId: string,
    action: string,
    actionName: string,
  ) => void;
  onAddLogicNodeAtPoint?: (
    type: WorkflowNodeType,
    point: { x: number; y: number },
    defaults?: Record<string, unknown>,
  ) => void;
  onAddPluginNodeAtPoint?: (
    pluginId: string,
    action: string,
    actionName: string,
    point: { x: number; y: number },
  ) => void;
}>();

const search = ref("");
const methodSearch = ref("");
const panelRef = ref<HTMLElement | null>(null);
const searchInput = ref<InstanceType<typeof BaseInput>>();
const methodSearchInput = ref<InstanceType<typeof BaseInput>>();
const utilitiesOpen = ref(true);
const integrationsOpen = ref(true);
const selectedPlugin = ref<PluginSummary | null>(null);
const vectorStoreProviderPickerOpen = ref(false);
const dragPreview = ref<DragPreviewMeta | null>(null);
const dragPreviewPoint = ref({ x: 0, y: 0 });
const dragPreviewVelocity = ref({ x: 0, y: 0 });
const dragPreviewScale = ref(0.72);
const dragPreviewBodyOffset = ref({ x: 0, y: 0, rotate: 0 });
let targetBodyOffset = { x: 0, y: 0, rotate: 0 };
let lastDragPoint = { x: 0, y: 0, t: 0 };
let activePointerPayload: GlobalAddNodeDragPayload | null = null;
let activePointerId: number | null = null;
let pointerDragStarted = false;
let pointerStartPoint = { x: 0, y: 0 };
let suppressClickUntil = 0;
let windAnimationFrame: number | null = null;
const { iconVariant } = useTheme();
const {
  data: plugins,
  loading: pluginsLoading,
  execute: loadPlugins,
} = useApi(pluginsApi.getAll);
const {
  data: workflowNodeCatalog,
  loading: workflowNodeCatalogLoading,
  execute: loadWorkflowNodeCatalog,
} = useApi(workflowNodesApi.getCatalog);

watch(
  workflowNodeCatalog,
  (catalog) => replaceNodeDefinitions(catalog?.nodes ?? []),
  {
    immediate: true,
  },
);

onMounted(() => {
  loadPlugins();
  loadWorkflowNodeCatalog();
  searchInput.value?.focus();
});

onBeforeUnmount(() => {
  removePointerDragListeners();
});

const isLoading = computed(
  () => pluginsLoading.value || workflowNodeCatalogLoading.value,
);
const normalizedSearch = computed(() => search.value.trim().toLowerCase());
const normalizedMethodSearch = computed(() =>
  methodSearch.value.trim().toLowerCase(),
);

const matchesSearch = (...values: Array<string | undefined>) => {
  const query = normalizedSearch.value;
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
};

const matchesMethodSearch = (...values: Array<string | undefined>) => {
  const query = normalizedMethodSearch.value;
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
};

const utilityItems = computed<AddNodePickerPreset[]>(() =>
  filterDefaultPickerPresets(
    catalogItemsToPickerPresets(workflowNodeCatalog.value?.nodes ?? []),
  ).filter((item) => matchesSearch(item.label, item.description)),
);

const vectorStoreProviderItems = computed(() =>
  buildVectorStoreProviderItems({ plugins: plugins.value ?? [] }),
);

const filteredVectorStoreProviderItems = computed(() =>
  vectorStoreProviderItems.value.filter((item) =>
    matchesMethodSearch(item.label, item.description, item.plugin.id),
  ),
);

const pluginItems = computed(() => plugins.value ?? []);

const utilityPluginItems = computed(() =>
  pluginItems.value
    .filter((plugin) => plugin.manifest.metadata.utility === true)
    .filter((plugin) =>
      matchesSearch(
        plugin.manifest.metadata.name,
        plugin.manifest.metadata.description,
      ),
    ),
);

const integrationItems = computed(() =>
  pluginItems.value
    .filter((plugin) => plugin.manifest.metadata.utility !== true)
    .filter((plugin) =>
      matchesSearch(
        plugin.manifest.metadata.name,
        plugin.manifest.metadata.description,
      ),
    ),
);

const pluginIcon = (plugin: PluginSummary) =>
  resolvePluginIcon(plugin.manifest.metadata, {
    iconVariant: iconVariant.value,
    fallback: "box",
  });

const pluginStyle = (plugin: PluginSummary) => ({
  "--node-icon-bg": plugin.manifest.metadata.style?.bgColor,
  "--node-icon-border": plugin.manifest.metadata.style?.borderColor,
  "--node-icon-color": plugin.manifest.metadata.style?.iconColor,
});

const pluginActionItems = (plugin: PluginSummary) =>
  buildPickerActionItems({ plugin, search: "" });

const pluginNeedsMethodSubmenu = (plugin: PluginSummary) =>
  plugin.manifest.metadata.nodePresentation?.template !== "vector-store" &&
  pluginActionItems(plugin).length > 1;

const filteredSelectedPluginActions = computed(() => {
  if (!selectedPlugin.value) return [];
  return pluginActionItems(selectedPlugin.value).filter((action) =>
    matchesMethodSearch(action.label, action.description, action.methodKey),
  );
});

const startDragPreview = (
  point: { x: number; y: number },
  preview?: DragPreviewMeta,
) => {
  if (!preview) return;
  dragPreview.value = preview;
  dragPreviewPoint.value = point;
  dragPreviewVelocity.value = { x: 0, y: 0 };
  dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 };
  targetBodyOffset = { x: 0, y: 0, rotate: 0 };
  dragPreviewScale.value = 0.72;
  lastDragPoint = { ...point, t: performance.now() };
  requestAnimationFrame(() => {
    dragPreviewScale.value = 1;
  });
  startWindAnimation();
};

const startWindAnimation = () => {
  if (windAnimationFrame !== null) return;
  const tick = () => {
    const current = dragPreviewBodyOffset.value;
    const next = {
      x: current.x + (targetBodyOffset.x - current.x) * 0.22,
      y: current.y + (targetBodyOffset.y - current.y) * 0.22,
      rotate:
        current.rotate + (targetBodyOffset.rotate - current.rotate) * 0.22,
    };
    dragPreviewBodyOffset.value = next;
    targetBodyOffset = {
      x: targetBodyOffset.x * 0.88,
      y: targetBodyOffset.y * 0.88,
      rotate: targetBodyOffset.rotate * 0.88,
    };

    if (
      dragPreview.value &&
      (Math.abs(next.x) > 0.05 ||
        Math.abs(next.y) > 0.05 ||
        Math.abs(next.rotate) > 0.05 ||
        Math.abs(targetBodyOffset.x) > 0.05 ||
        Math.abs(targetBodyOffset.y) > 0.05 ||
        Math.abs(targetBodyOffset.rotate) > 0.05)
    ) {
      windAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 };
    targetBodyOffset = { x: 0, y: 0, rotate: 0 };
    windAnimationFrame = null;
  };

  windAnimationFrame = requestAnimationFrame(tick);
};

const moveDragPreview = (
  point: { x: number; y: number },
  movement: { x: number; y: number } = { x: 0, y: 0 },
) => {
  if (!dragPreview.value) return;
  const now = performance.now();
  const dt = Math.max(now - lastDragPoint.t, 16);
  const dx = point.x - lastDragPoint.x;
  const dy = point.y - lastDragPoint.y;
  dragPreviewPoint.value = point;
  dragPreviewVelocity.value = {
    x: Math.max(-36, Math.min(36, dx * 2.2 + (dx / dt) * 10)),
    y: Math.max(-18, Math.min(18, dy * 1.2 + (dy / dt) * 6)),
  };
  const forceX = movement.x || dx;
  const forceY = movement.y || dy;
  const lateralPull = Math.max(
    -58,
    Math.min(58, forceX * 6 + dragPreviewVelocity.value.x * 0.65),
  );
  const verticalLift = Math.min(
    34,
    Math.abs(forceX) * 2.4 +
      Math.abs(forceY) * 0.7 +
      Math.abs(dragPreviewVelocity.value.x) * 0.3,
  );
  targetBodyOffset = {
    x: lateralPull,
    y: verticalLift,
    rotate: Math.max(-24, Math.min(24, -lateralPull * 0.42)),
  };
  startWindAnimation();
  lastDragPoint = { ...point, t: now };
};

const removePointerDragListeners = () => {
  const ownerDocument = ownerDocumentOf(panelRef.value);
  const ownerWindow = ownerWindowOf(panelRef.value);
  ownerDocument.removeEventListener("pointermove", handlePointerDragMove, true);
  ownerDocument.removeEventListener("pointerup", handlePointerDragEnd, true);
  ownerDocument.removeEventListener(
    "pointercancel",
    handlePointerDragCancel,
    true,
  );
  ownerWindow.removeEventListener("pointermove", handlePointerDragMove, true);
  ownerWindow.removeEventListener("pointerup", handlePointerDragEnd, true);
  ownerWindow.removeEventListener(
    "pointercancel",
    handlePointerDragCancel,
    true,
  );
};

const handleDragEnd = () => {
  dragPreviewScale.value = 0.82;
  removePointerDragListeners();
  window.setTimeout(() => {
    dragPreview.value = null;
    dragPreviewVelocity.value = { x: 0, y: 0 };
    dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 };
    targetBodyOffset = { x: 0, y: 0, rotate: 0 };
    if (windAnimationFrame !== null) {
      cancelAnimationFrame(windAnimationFrame);
      windAnimationFrame = null;
    }
  }, 120);
};

const dragPreviewStyle = computed(() => {
  return {
    transform: `translate3d(${dragPreviewPoint.value.x - 72}px, ${dragPreviewPoint.value.y - 56}px, 0) scale(${dragPreviewScale.value})`,
  };
});

const dragPreviewBodyStyle = computed(() => {
  return {
    transform: `translate3d(${dragPreviewBodyOffset.value.x}px, ${dragPreviewBodyOffset.value.y}px, 0) rotate(${dragPreviewBodyOffset.value.rotate}deg)`,
  };
});

const handlePointerDragStart = (
  event: PointerEvent,
  payload: GlobalAddNodeDragPayload,
) => {
  if (event.button !== 0) return;
  const dragTarget = event.currentTarget as HTMLElement | null;
  dragTarget?.setPointerCapture?.(event.pointerId);
  activePointerPayload = payload;
  activePointerId = event.pointerId;
  pointerDragStarted = false;
  pointerStartPoint = { x: event.clientX, y: event.clientY };
  lastDragPoint = { ...pointerStartPoint, t: performance.now() };
  startDragPreview(pointerStartPoint, payload.preview);
  const ownerDocument = ownerDocumentOf(
    event.target instanceof Element ? event.target : panelRef.value,
  );
  const ownerWindow = ownerDocument.defaultView ?? window;
  ownerDocument.addEventListener("pointermove", handlePointerDragMove, true);
  ownerDocument.addEventListener("pointerup", handlePointerDragEnd, true);
  ownerDocument.addEventListener(
    "pointercancel",
    handlePointerDragCancel,
    true,
  );
  ownerWindow.addEventListener("pointermove", handlePointerDragMove, true);
  ownerWindow.addEventListener("pointerup", handlePointerDragEnd, true);
  ownerWindow.addEventListener("pointercancel", handlePointerDragCancel, true);
};

const handlePluginPointerDragStart = (
  event: PointerEvent,
  plugin: PluginSummary,
) => {
  if (plugin.manifest.metadata.nodePresentation?.template === "vector-store") {
    handlePointerDragStart(event, {
      kind: "logic",
      nodeType: "vector-store",
      defaults: vectorStoreDefaults(plugin),
      preview: {
        icon: pluginIcon(plugin),
        label:
          plugin.manifest.metadata.nodePresentation.label ??
          plugin.manifest.metadata.name,
        subtitle: "Vector Store",
      },
    });
    return;
  }

  const action = pluginActionItems(plugin)[0];
  if (!action || pluginActionItems(plugin).length !== 1) {
    return;
  }

  handlePointerDragStart(event, {
    kind: "plugin",
    pluginId: plugin.id,
    action: action.methodKey,
    actionName: action.label,
    preview: {
      icon: pluginIcon(plugin),
      label: plugin.manifest.metadata.name,
      subtitle: action.label,
    },
  });
};

const addSelectedPluginAction = (action: AddNodePickerActionItem) => {
  if (!selectedPlugin.value) return;
  props.onAddPluginNodeAtCenter?.(
    selectedPlugin.value.id,
    action.methodKey,
    action.label,
  );
};

const handleSelectedPluginActionDragStart = (
  event: PointerEvent,
  action: AddNodePickerActionItem,
) => {
  if (!selectedPlugin.value) return;
  const plugin = selectedPlugin.value;
  handlePointerDragStart(event, {
    kind: "plugin",
    pluginId: plugin.id,
    action: action.methodKey,
    actionName: action.label,
    preview: {
      icon: pluginIcon(plugin),
      label: action.label,
      subtitle: plugin.manifest.metadata.name,
    },
  });
};

const handleUtilityPointerDragStart = (
  event: PointerEvent,
  item: AddNodePickerPreset,
) => {
  if (item.nodeType === "vector-store") return;
  handlePointerDragStart(event, {
    kind: "logic",
    nodeType: item.nodeType,
    defaults: item.defaults,
    preview: {
      icon: item.icon,
      label: item.label,
      subtitle: "Utility",
    },
  });
};

const handlePointerDragMove = (event: PointerEvent) => {
  if (activePointerId !== event.pointerId || !activePointerPayload) return;
  const point = { x: event.clientX, y: event.clientY };
  const distance = Math.hypot(
    point.x - pointerStartPoint.x,
    point.y - pointerStartPoint.y,
  );
  if (!pointerDragStarted && distance < 4) return;
  event.preventDefault();
  if (!pointerDragStarted) {
    pointerDragStarted = true;
    startDragPreview(pointerStartPoint, activePointerPayload.preview);
  }
  moveDragPreview(point, { x: event.movementX, y: event.movementY });
};

const addPayloadAtPoint = (
  payload: GlobalAddNodeDragPayload,
  point: { x: number; y: number },
) => {
  if (payload.kind === "logic") {
    props.onAddLogicNodeAtPoint?.(payload.nodeType, point, payload.defaults);
    return;
  }
  props.onAddPluginNodeAtPoint?.(
    payload.pluginId,
    payload.action,
    payload.actionName,
    point,
  );
};

const handlePointerDragEnd = (event: PointerEvent) => {
  if (activePointerId !== event.pointerId) return;
  const payload = activePointerPayload;
  const wasDragging = pointerDragStarted;
  const point = { x: event.clientX, y: event.clientY };
  activePointerPayload = null;
  activePointerId = null;
  pointerDragStarted = false;
  removePointerDragListeners();

  if (!wasDragging) {
    handleDragEnd();
    return;
  }

  if (payload) {
    event.preventDefault();
    suppressClickUntil = Date.now() + 250;
    const target = ownerDocumentOf(panelRef.value).elementFromPoint(
      point.x,
      point.y,
    );
    if (target?.closest(".fabric-workflow-canvas")) {
      addPayloadAtPoint(payload, { x: point.x - 52, y: point.y - 52 });
    }
    handleDragEnd();
  }
};

const handlePointerDragCancel = () => {
  activePointerPayload = null;
  activePointerId = null;
  pointerDragStarted = false;
  handleDragEnd();
};

const preventClickAfterDrag = (event: MouseEvent) => {
  if (Date.now() > suppressClickUntil) return;
  event.preventDefault();
  event.stopPropagation();
};

const selectPlugin = (plugin: PluginSummary) => {
  vectorStoreProviderPickerOpen.value = false;
  if (plugin.manifest.metadata.nodePresentation?.template === "vector-store") {
    addVectorStoreNodeAtCenter(plugin);
    return;
  }

  const actions = pluginActionItems(plugin);
  if (actions.length === 1) {
    const action = actions[0];
    if (action) {
      props.onAddPluginNodeAtCenter?.(
        plugin.id,
        action.methodKey,
        action.label,
      );
    }
    return;
  }

  selectedPlugin.value = plugin;
  methodSearch.value = "";
  void nextTick(() => methodSearchInput.value?.focus());
};

const vectorStoreDefaults = (
  plugin: PluginSummary,
): Record<string, unknown> => ({
  name: plugin.manifest.metadata.name,
  pluginId: plugin.id,
  ensureCollectionMethodId: "ensureCollection",
  upsertMethodId: "upsertDocuments",
  queryMethodId: "querySimilar",
  deleteMethodId: "deleteDocuments",
  describeMethodId: "describeCollection",
  collectionName: "documents",
  dimension: 1536,
  metric: "cosine",
  config: {},
  retrievalMode: "index-and-query",
  query: "",
  topK: 5,
  outputMode: "context",
  maxContextChars: 8000,
  filter: {},
});

const openVectorStoreProviderPicker = () => {
  selectedPlugin.value = null;
  vectorStoreProviderPickerOpen.value = true;
  methodSearch.value = "";
  void nextTick(() => methodSearchInput.value?.focus());
};

const addVectorStoreNodeAtCenter = (plugin: PluginSummary) => {
  props.onAddLogicNodeAtCenter?.("vector-store", vectorStoreDefaults(plugin));
};

const selectUtilityItem = (item: AddNodePickerPreset) => {
  if (item.nodeType === "vector-store") {
    openVectorStoreProviderPicker();
    return;
  }
  props.onAddLogicNodeAtCenter?.(item.nodeType, item.defaults);
};

const closePluginMethodView = () => {
  selectedPlugin.value = null;
  vectorStoreProviderPickerOpen.value = false;
  methodSearch.value = "";
  void nextTick(() => searchInput.value?.focus());
};
</script>

<style scoped>
.global-add-node-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--fabric-global-add-node-panel-bg-surface);
  color: var(--fabric-global-add-node-panel-text-primary);
}

.global-add-node-panel__browse-view,
.global-add-node-panel__method-view {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.global-add-node-panel__toolbar,
.global-add-node-panel__method-header {
  flex: 0 0 auto;
  padding: var(--fabric-space-3);
  border-bottom: 1px solid var(--fabric-global-add-node-panel-border);
}

.global-add-node-panel__method-header {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.global-add-node-panel__method-header :deep(.base-input-wrapper) {
  flex: 1;
}

.global-add-node-panel__method-title {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-3);
  border-bottom: 1px solid var(--fabric-global-add-node-panel-border);
  font-size: var(--fabric-text-sm);
  font-weight: 700;
}

.global-add-node-panel__loading,
.global-add-node-panel__empty {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-space-2);
  color: var(--fabric-global-add-node-panel-text-muted);
  font-size: var(--fabric-text-sm);
}

.global-add-node-panel__spinner {
  animation: global-add-node-spin 1s linear infinite;
}

.global-add-node-panel__sections,
.global-add-node-panel__method-list {
  min-height: 0;
  overflow-y: auto;
  padding: var(--fabric-space-2) var(--fabric-space-3) var(--fabric-space-4);
}

.global-add-node-panel__section {
  border-bottom: 1px solid var(--fabric-global-add-node-panel-border);
}

.global-add-node-panel__section-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: var(--fabric-space-3) 0;
  border: 0;
  background: transparent;
  color: var(--fabric-global-add-node-panel-text-primary);
  font: inherit;
  font-size: var(--fabric-text-sm);
  font-weight: 700;
  cursor: pointer;
}

.global-add-node-panel__section-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--fabric-space-2);
}

.global-add-node-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--fabric-space-2);
  overflow: hidden;
  padding-bottom: var(--fabric-space-3);
}

.global-add-node-panel__item,
.global-add-node-panel__method-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--fabric-space-2);
  border: 0;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
  color: var(--fabric-global-add-node-panel-text-primary);
  font: inherit;
  font-size: var(--fabric-text-sm);
  text-align: left;
  cursor: grab;
}

.global-add-node-panel__item {
  min-height: 38px;
  padding: var(--fabric-space-1);
}

.global-add-node-panel__item:hover,
.global-add-node-panel__method-item:hover {
  background: var(--fabric-global-add-node-panel-button-ghost-hover);
}

.global-add-node-panel__icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid
    var(--node-icon-border, var(--fabric-global-add-node-panel-border));
  border-radius: var(--fabric-radius-sm);
  background: var(
    --node-icon-bg,
    var(--fabric-global-add-node-panel-bg-surface)
  );
  color: var(--node-icon-color, var(--fabric-global-add-node-panel-text-muted));
}

.global-add-node-panel__item > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-panel__method-more {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--fabric-global-add-node-panel-text-muted);
}

.global-add-node-panel__method-list {
  display: grid;
  align-content: start;
  gap: var(--fabric-space-1);
}

.global-add-node-panel__method-item {
  display: flex;
  min-height: 42px;
  flex-direction: row;
  align-items: center;
  padding: var(--fabric-space-1);
}

.global-add-node-panel__method-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fabric-global-add-node-panel-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-global-add-node-panel-bg-surface);
  color: var(--fabric-global-add-node-panel-text-muted);
}

.global-add-node-panel__method-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.global-add-node-panel__method-body span,
.global-add-node-panel__method-body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-panel__method-item small {
  color: var(--fabric-global-add-node-panel-text-muted);
  font-size: var(--fabric-text-xs);
}

.global-add-node-section-enter-active,
.global-add-node-section-leave-active,
.global-add-node-view-enter-active,
.global-add-node-view-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    max-height 0.2s ease;
}

.global-add-node-section-enter-active,
.global-add-node-section-leave-active {
  max-height: 520px;
}

.global-add-node-section-enter-from,
.global-add-node-section-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.global-add-node-view-enter-from,
.global-add-node-view-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@keyframes global-add-node-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
.global-add-node-drag-preview {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483400;
  width: 144px;
  pointer-events: none;
  text-align: center;
  transform-origin: center 62px;
  transition:
    transform 0.04s linear,
    opacity 0.12s ease;
  will-change: transform;
}

.global-add-node-drag-preview__body {
  will-change: transform;
}

.global-add-node-drag-preview__node {
  position: relative;
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--fabric-space-2);
  border: 2px solid var(--fabric-global-add-node-panel-border);
  border-radius: 22px;
  background: var(--fabric-global-add-node-panel-bg-elevated);
  box-shadow: var(--fabric-global-add-node-panel-shadow-lg);
}

.global-add-node-drag-preview__icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  color: var(--fabric-global-add-node-panel-text-primary);
}

.global-add-node-drag-preview__label {
  overflow: hidden;
  color: var(--fabric-global-add-node-panel-text-primary);
  font-size: var(--fabric-text-sm);
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-drag-preview__subtitle {
  overflow: hidden;
  color: var(--fabric-global-add-node-panel-text-muted);
  font-size: var(--fabric-text-xs);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
