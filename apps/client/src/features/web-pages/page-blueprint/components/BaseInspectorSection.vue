<template>
  <section
    class="web-page-blueprint-inspector-section"
    :class="{ 'web-page-blueprint-inspector-section--collapsed': !isExpanded }"
  >
    <button
      class="web-page-blueprint-inspector-section__header"
      type="button"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <LucideIcon
        name="chevron-down"
        :size="12"
        class="web-page-blueprint-inspector-section__chevron"
      />
      <LucideIcon v-if="icon" :name="icon" :size="13" />
      <span>{{ title }}</span>
      <span class="web-page-blueprint-inspector-section__spacer" />
      <span
        v-if="$slots.actions"
        class="web-page-blueprint-inspector-section__actions"
        @click.stop
      >
        <slot name="actions" />
      </span>
    </button>
    <Transition
      name="web-page-blueprint-inspector-collapse"
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @before-leave="beforeLeave"
      @leave="leave"
    >
      <div v-show="isExpanded" class="web-page-blueprint-inspector-section__body">
        <slot />
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  icon?: string
}>(), {
  icon: '',
})

const isExpanded = ref(true)

function beforeEnter(element: Element) {
  const target = element as HTMLElement
  target.style.height = '0'
  target.style.opacity = '0'
}

function enter(element: Element) {
  const target = element as HTMLElement
  target.style.height = `${target.scrollHeight}px`
  target.style.opacity = '1'
}

function afterEnter(element: Element) {
  const target = element as HTMLElement
  target.style.height = ''
  target.style.opacity = ''
}

function beforeLeave(element: Element) {
  const target = element as HTMLElement
  target.style.height = `${target.scrollHeight}px`
  target.style.opacity = '1'
}

function leave(element: Element) {
  const target = element as HTMLElement
  requestAnimationFrame(() => {
    target.style.height = '0'
    target.style.opacity = '0'
  })
}
</script>
