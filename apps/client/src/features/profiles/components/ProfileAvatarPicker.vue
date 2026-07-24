<template>
  <div class="avatar-btn-wrapper" ref="wrapperRef">
    <button
      type="button"
      class="avatar-btn"
      :aria-label="`Avatar atual: ${model}. Clique para escolher`"
      @click="togglePicker"
    >
      <span class="avatar-btn__emoji">{{ model }}</span>
      <span class="avatar-btn__hint">
        <LucideIcon name="pencil" :size="13" />
      </span>
    </button>

    <Transition name="picker-fade">
      <div v-if="open" class="avatar-btn__dropdown" role="dialog" aria-label="Escolher emoji">
        <EmojiPicker
          :native="true"
          :hide-search="false"
          :hide-group-icons="false"
          :disable-skin-tones="true"
          :static-texts="{ placeholder: 'Buscar emoji...' }"
          @select="onSelect"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import {
  rememberProfileAvatar,
  PROFILE_AVATAR_RECENT_STORAGE_KEY,
} from '../profileAvatarPickerOptions'

const model = defineModel<string>({ required: true })
const open = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

function togglePicker() {
  open.value = !open.value
}

function onSelect(emoji: { i: string }) {
  model.value = emoji.i
  open.value = false

  try {
    const stored = window.localStorage.getItem(PROFILE_AVATAR_RECENT_STORAGE_KEY)
    const current: string[] = stored ? JSON.parse(stored) : []
    const updated = rememberProfileAvatar(current, emoji.i)
    window.localStorage.setItem(PROFILE_AVATAR_RECENT_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function onClickOutside(event: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style scoped>
.avatar-btn-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.avatar-btn {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 2px solid var(--fabric-profile-avatar-picker-border-strong);
  background: var(--fabric-profile-avatar-picker-bg-elevated);
  font-size: 42px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    background-color 160ms ease;
}

.avatar-btn:hover {
  border-color: var(--fabric-profile-avatar-picker-border-brand);
  transform: scale(1.05);
  background: var(--fabric-profile-avatar-picker-bg-overlay);
}

.avatar-btn__emoji {
  line-height: 1;
  pointer-events: none;
}

.avatar-btn__hint {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--fabric-profile-avatar-picker-bg-overlay);
  border: 1px solid var(--fabric-profile-avatar-picker-border-strong);
  color: var(--fabric-profile-avatar-picker-text-secondary);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.avatar-btn__dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--fabric-z-overlay);
  border-radius: var(--fabric-radius-md);
  overflow: hidden;
  box-shadow: var(--fabric-profile-avatar-picker-shadow-xl);
}

/* ── Mapeia os tokens do Fabric nas variáveis do vue3-emoji-picker ── */
.avatar-btn__dropdown :deep(.v3-emoji-picker) {
  --v3-picker-bg: var(--fabric-profile-avatar-picker-bg-elevated);
  --v3-picker-fg: var(--fabric-profile-avatar-picker-text-primary);
  --v3-picker-border: var(--fabric-profile-avatar-picker-border-strong);
  --v3-picker-input-bg: var(--fabric-profile-avatar-picker-input-bg);
  --v3-picker-input-border: var(--fabric-profile-avatar-picker-input-border);
  --v3-picker-input-focus-border: var(--fabric-profile-avatar-picker-input-border-focus);
  --v3-picker-emoji-hover: var(--fabric-profile-avatar-picker-bg-overlay);
  --avatar-picker-tab-icon-filter: brightness(0) saturate(100%) invert(68%) sepia(0%) saturate(0%)
    hue-rotate(144deg) brightness(92%) contrast(89%);
  --avatar-picker-tab-icon-hover-filter: brightness(0) saturate(100%) invert(97%) sepia(0%)
    saturate(7500%) hue-rotate(45deg) brightness(113%) contrast(90%);
  border-radius: var(--fabric-radius-md);
  border: 1px solid var(--fabric-profile-avatar-picker-border);
}

:global(html.light) .avatar-btn__dropdown :deep(.v3-emoji-picker) {
  --avatar-picker-tab-icon-filter: brightness(0) saturate(100%) invert(32%) sepia(0%) saturate(0%)
    hue-rotate(179deg) brightness(90%) contrast(89%);
  --avatar-picker-tab-icon-hover-filter: brightness(0) saturate(100%) invert(4%) sepia(2%)
    saturate(674%) hue-rotate(314deg) brightness(100%) contrast(86%);
}

/* Cabeçalho e rodapé */
.avatar-btn__dropdown :deep(.v3-header),
.avatar-btn__dropdown :deep(.v3-footer) {
  border-color: var(--fabric-profile-avatar-picker-border) !important;
}

/* Abas de categoria */
.avatar-btn__dropdown :deep(.v3-header .v3-groups .v3-group) {
  opacity: 1;
}

.avatar-btn__dropdown :deep(.v3-header .v3-groups .v3-group img) {
  filter: var(--avatar-picker-tab-icon-filter);
  opacity: 1;
  transition: filter 160ms ease;
}

.avatar-btn__dropdown :deep(.v3-header .v3-groups .v3-group:hover img),
.avatar-btn__dropdown :deep(.v3-header .v3-groups .v3-group:focus-visible img) {
  filter: var(--avatar-picker-tab-icon-hover-filter);
}

/* Títulos de grupo */
.avatar-btn__dropdown :deep(.v3-group h5) {
  color: var(--fabric-profile-avatar-picker-text-muted);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Input de busca */
.avatar-btn__dropdown :deep(.v3-search input) {
  border-radius: var(--fabric-radius-sm);
  font-family: var(--fabric-font-sans);
  font-size: var(--fabric-text-sm);
  color: var(--fabric-profile-avatar-picker-input-text);
}

.avatar-btn__dropdown :deep(.v3-search input::placeholder) {
  color: var(--fabric-profile-avatar-picker-input-placeholder);
}

/* Scrollbar */
.avatar-btn__dropdown :deep(.v3-body-inner) {
  scrollbar-width: thin;
  scrollbar-color: var(--fabric-scrollbar-thumb) transparent;
}

/* Transition */
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
