<template>
  <div class="node-shimmer" aria-hidden="true">
    <div class="node-shimmer__sweep"></div>
  </div>
</template>

<script setup lang="ts">
// No props — purely decorative overlay
</script>

<style scoped>
.node-shimmer {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 10;
  overflow: hidden;
  border-radius: inherit;
}

.node-shimmer__sweep {
  position: absolute;
  inset-block: 0;
  width: 55%;
  transform: translateX(-100%);
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--node-shimmer-color, rgba(245, 158, 11, 0.18)) 50%,
    transparent 100%
  );
  animation: fabric-shimmer 1.5s ease-in-out infinite;
}

@keyframes fabric-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
</style>
