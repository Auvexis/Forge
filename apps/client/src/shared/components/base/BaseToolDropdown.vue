<template>
  <div class="base-tool-dropdown" @keydown.esc="close">
    <BaseButton
      ref="triggerRef"
      class="base-tool-dropdown__trigger"
      variant="ghost"
      size="icon"
      :icon-left="icon"
      :title="label"
      :data-tooltip="hint ?? label"
      :aria-label="label"
      :aria-expanded="isOpen"
      @click="toggle"
      @mouseenter="handleTriggerMouseEnter"
    />
    <RenderPortal>
      <div
        v-if="isOpen"
        ref="menuRef"
        class="base-tool-dropdown__menu"
        :class="`base-tool-dropdown__menu--${position}`"
        :style="menuStyle"
        role="menu"
      >
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="base-tool-dropdown__item"
          draggable="true"
          role="menuitem"
          @click="selectTool(tool)"
          @dragstart="onToolDragStart($event, tool)"
          @dragend="onToolDragEnd"
        >
          <LucideIcon :name="tool.icon" :size="15" />
          <span>{{ tool.label }}</span>
        </button>
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
import BaseButton from "./BaseButton.vue";
import LucideIcon from "@/shared/icons/LucideIcon.vue";
import { RenderPortal, ownerDocumentOf, ownerWindowOf } from "@renderizer/vue";

export interface BaseToolDropdownItem {
  id: string;
  label: string;
  icon: string;
}

const props = withDefaults(
  defineProps<{
    dropdownId?: string;
    label: string;
    icon: string;
    hint?: string;
    tools: BaseToolDropdownItem[];
    activeDropdownId?: string | null;
    isAnyDropdownOpen?: boolean;
    position?: "top" | "bottom";
  }>(),
  {
    dropdownId: undefined,
    hint: undefined,
    activeDropdownId: null,
    isAnyDropdownOpen: false,
    position: "top",
  },
);

const emit = defineEmits<{
  open: [id: string];
  close: [id: string];
  select: [tool: BaseToolDropdownItem];
  dragstart: [event: DragEvent, tool: BaseToolDropdownItem];
}>();

const triggerRef = ref<InstanceType<typeof BaseButton> | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isDragging = ref(false);
const menuRect = ref({ left: 0, top: 0 });
const triggerElement = computed(
  () => triggerRef.value?.$el as HTMLElement | null,
);

const menuStyle = computed(() => ({
  left: `${menuRect.value.left}px`,
  top: `${menuRect.value.top}px`,
}));

function toggle() {
  if (isOpen.value) {
    requestClose();
    return;
  }
  requestOpen();
}

function close() {
  isOpen.value = false;
}

function open() {
  isOpen.value = true;
  void nextTick(updateMenuPosition);
}

function selectTool(tool: BaseToolDropdownItem) {
  emit("select", tool);
  requestClose();
}

function onToolDragStart(event: DragEvent, tool: BaseToolDropdownItem) {
  isDragging.value = true;
  emit("dragstart", event, tool);
}

function onToolDragEnd() {
  isDragging.value = false;
  requestClose();
}

function handleTriggerMouseEnter() {
  if (props.isAnyDropdownOpen && props.activeDropdownId !== props.dropdownId)
    requestOpen();
}

function requestOpen() {
  if (props.dropdownId) {
    emit("open", props.dropdownId);
    return;
  }
  open();
}

function requestClose() {
  if (props.dropdownId) {
    emit("close", props.dropdownId);
    return;
  }
  close();
}

function updateMenuPosition() {
  const trigger = triggerElement.value ?? undefined;
  const menu = menuRef.value;
  if (!trigger || !menu) return;

  const triggerBox = trigger.getBoundingClientRect();
  const menuBox = menu.getBoundingClientRect();
  const gap = 8;
  const left = triggerBox.left + (triggerBox.width - menuBox.width) / 2;
  const top =
    props.position === "top"
      ? triggerBox.top - menuBox.height - gap
      : triggerBox.bottom + gap;

  const ownerWindow = ownerWindowOf(trigger);
  menuRect.value = {
    left: Math.min(
      Math.max(8, left),
      ownerWindow.innerWidth - menuBox.width - 8,
    ),
    top: Math.min(
      Math.max(8, top),
      ownerWindow.innerHeight - menuBox.height - 8,
    ),
  };
}

function onDocumentPointerDown(event: PointerEvent) {
  const trigger = triggerElement.value ?? undefined;
  if (!isOpen.value) return;
  if (isDragging.value) return;
  if (
    trigger?.contains(event.target as Node) ||
    menuRef.value?.contains(event.target as Node)
  )
    return;
  requestClose();
}

watch(
  () => props.activeDropdownId,
  (activeDropdownId) => {
    if (!props.dropdownId) return;
    if (activeDropdownId === props.dropdownId) open();
    else close();
  },
);

onMounted(() => {
  const ownerDocument = ownerDocumentOf(triggerElement.value);
  const ownerWindow = ownerWindowOf(triggerElement.value);
  ownerDocument.addEventListener("pointerdown", onDocumentPointerDown, true);
  ownerWindow.addEventListener("resize", updateMenuPosition);
});

onBeforeUnmount(() => {
  const ownerDocument = ownerDocumentOf(triggerElement.value);
  const ownerWindow = ownerWindowOf(triggerElement.value);
  ownerDocument.removeEventListener("pointerdown", onDocumentPointerDown, true);
  ownerWindow.removeEventListener("resize", updateMenuPosition);
});
</script>

<style scoped>
.base-tool-dropdown {
  position: relative;
  display: inline-flex;
}

.base-tool-dropdown__trigger {
  position: relative;
}

.base-tool-dropdown__trigger::after {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 1;
  padding: 4px 7px;
  border-radius: var(--fabric-base-tool-dropdown-badge-radius);
  background: var(--fabric-base-tool-dropdown-text-primary);
  color: var(--fabric-base-tool-dropdown-bg-surface);
  content: attr(data-tooltip);
  font-size: var(--fabric-text-xs);
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 120ms var(--fabric-ease-standard),
    transform 120ms var(--fabric-ease-standard);
  white-space: nowrap;
}

.base-tool-dropdown__trigger:hover::after,
.base-tool-dropdown__trigger:focus-visible::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.base-tool-dropdown__menu {
  position: fixed;
  z-index: calc(var(--fabric-z-modal) + 1);
  display: grid;
  min-width: 156px;
  gap: 2px;
  padding: var(--fabric-space-1);
  border: 1px solid var(--fabric-base-tool-dropdown-border);
  border-radius: var(--fabric-base-tool-dropdown-menu-radius);
  background: var(--fabric-base-tool-dropdown-bg-surface);
  box-shadow: var(--fabric-base-tool-dropdown-shadow-lg);
}

.base-tool-dropdown__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: var(--fabric-space-2);
  min-height: 30px;
  padding: 0 var(--fabric-space-2);
  border-radius: var(--fabric-base-tool-dropdown-item-radius);
  color: var(--fabric-base-tool-dropdown-text-primary);
  cursor: grab;
  font-size: var(--fabric-text-xs);
  text-align: left;
}

.base-tool-dropdown__item:hover {
  background: var(--fabric-base-tool-dropdown-button-ghost-hover);
}

.base-tool-dropdown__item:active {
  cursor: grabbing;
}
</style>
