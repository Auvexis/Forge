<script setup lang="ts">
defineProps<{ inDrilldownInput?: boolean }>()
</script>

<template>
  <footer class="cp-footer">
    <template v-if="inDrilldownInput">
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
