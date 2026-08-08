import type { DirectiveBinding, ObjectDirective } from 'vue'

const clickOutsideEvents = ['click', 'touchstart']

interface ClickOutsideElement extends HTMLElement {
  __click_outside__: (event: Event) => void
  __click_outside_document__?: Document
}

/**
 * v-click-outside directive
 * Executes a callback when the user clicks outside the bound element.
 */
export const vClickOutside: ObjectDirective<ClickOutsideElement> = {
  mounted(el, binding: DirectiveBinding) {
    el.__click_outside__ = (event: Event) => {
      // Check if the click was outside the element and its children
      if (!(el === event.target || el.contains(event.target as Node))) {
        // Invoke the provided callback
        binding.value(event)
      }
    }

    el.__click_outside_document__ = el.ownerDocument
    clickOutsideEvents.forEach((eventName) => {
      el.__click_outside_document__?.addEventListener(eventName, el.__click_outside__)
    })
  },
  unmounted(el) {
    clickOutsideEvents.forEach((eventName) => {
      el.__click_outside_document__?.removeEventListener(eventName, el.__click_outside__)
    })
    delete (el as any).__click_outside__
    delete el.__click_outside_document__
  },
}
