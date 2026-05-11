<script setup lang="ts">
defineProps<{ inDrilldownInput?: boolean; inConfirm?: boolean }>()
</script>

<template>
  <footer class="cp-footer">
    <template v-if="inConfirm">
      <span class="cp-footer__danger"><kbd>Enter</kbd> Confirm Action</span>
      <span><kbd>Esc</kbd> Cancel</span>
    </template>
    <template v-else-if="inDrilldownInput">
      <span><kbd>Enter</kbd> Confirm</span>
      <span><kbd>Esc</kbd> Back</span>
    </template>
    <template v-else>
      <span><kbd>Enter</kbd> Run</span>
      <span><kbd>Esc</kbd> Close</span>
      <span><kbd>↑</kbd><kbd>↓</kbd> Move</span>
    </template>
  </footer>
</template>
