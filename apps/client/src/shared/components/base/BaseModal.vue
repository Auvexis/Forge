<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { RenderPortal, ownerWindowOf } from "@renderizer/vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    maxWidth?: string;
    height?: string;
    dimBackdrop?: boolean;
  }>(),
  {
    dimBackdrop: true,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const anchorRef = ref<HTMLElement | null>(null);

function close() {
  emit("close");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.isOpen) {
    close();
  }
}

onMounted(() => {
  ownerWindowOf(anchorRef.value).addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  ownerWindowOf(anchorRef.value).removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <span ref="anchorRef" class="base-modal-anchor" aria-hidden="true"></span>
  <RenderPortal>
    <Transition name="base-modal-window">
      <div
        v-if="isOpen"
        class="base-modal-backdrop"
        :class="{ 'base-modal-backdrop--clear': !dimBackdrop }"
        @click.self="close"
      >
        <div
          class="base-modal-container flex flex-col overflow-hidden"
          :style="{
            maxWidth: maxWidth || '1600px',
            height: height || '85vh',
            width: '95vw',
          }"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </RenderPortal>
</template>

<style scoped>
.base-modal-anchor {
  display: none;
}

.base-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--fabric-base-modal-backdrop);
}

.base-modal-backdrop--clear {
  background: transparent;
}

.base-modal-container {
  position: relative;
  background: var(--fabric-base-modal-bg);
  color: var(--fabric-base-modal-text);
  border: 1px solid var(--fabric-base-modal-border);
  box-shadow: none;
  border-radius: var(--fabric-base-modal-radius);
  outline: 1px solid var(--fabric-base-modal-inner-border);
  outline-offset: -2px;
}

.base-modal-container::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: var(--fabric-base-modal-highlight);
  pointer-events: none;
}

/* Window-style overlay transition */
.base-modal-window-enter-active,
.base-modal-window-leave-active {
  transition: opacity 120ms linear;
}

.base-modal-window-enter-from,
.base-modal-window-leave-to {
  opacity: 0;
}

.base-modal-window-enter-active .base-modal-container {
  transition:
    transform 140ms cubic-bezier(0.2, 0, 0, 1),
    opacity 120ms linear;
}

.base-modal-window-leave-active .base-modal-container {
  transition:
    transform 90ms cubic-bezier(0.4, 0, 1, 1),
    opacity 90ms linear;
}

.base-modal-window-enter-from .base-modal-container {
  opacity: 0;
  transform: translateY(6px) scale(0.992);
}

.base-modal-window-leave-to .base-modal-container {
  opacity: 0;
  transform: translateY(2px) scale(0.996);
}
</style>
