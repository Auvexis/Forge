<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type { PluginStatusResponse } from '@/core/types/plugin.types'
import PluginMenuAuth from '../editors/PluginMenuAuth.vue'

const props = defineProps<{
  pluginId: string
}>()

const pluginStatus = ref<PluginStatusResponse | null>(null)
const isOpen = ref(false)

const loadStatus = async () => {
  try {
    const data = await pluginsApi.getStatus(props.pluginId)
    pluginStatus.value = data
    // Auto-open if not connected
    if (data && data.auth_type !== 'none' && data.status !== 'connected') {
      isOpen.value = true
    } else {
      isOpen.value = false
    }
  } catch (error) {
    console.error('Failed to load plugin status', error)
  }
}

onMounted(loadStatus)
watch(() => props.pluginId, loadStatus)

function toggleOpen() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div v-if="pluginStatus && pluginStatus.auth_type !== 'none'" class="inline-auth-manager surface rounded-md mb-4 border border-fabric-border overflow-hidden">
    <!-- Header Summary -->
    <div 
      class="flex-between p-3 cursor-pointer select-none hover:bg-[var(--fabric-bg-elevated)] transition-colors"
      style="background: var(--fabric-bg-surface);"
      @click="toggleOpen"
    >
      <div class="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fabric-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span class="text-sm font-medium">Authentication</span>
        
        <!-- Status Badge -->
        <span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-semibold"
          :class="{
            'text-[rgb(34,197,94)] bg-[rgba(34,197,94,0.1)]': pluginStatus.status === 'connected',
            'text-[rgb(234,179,8)] bg-[rgba(234,179,8,0.1)]': pluginStatus.status === 'configured',
            'text-[rgb(239,68,68)] bg-[rgba(239,68,68,0.1)]': pluginStatus.status === 'not_configured'
          }"
        >
          <span v-if="pluginStatus.status === 'connected'">Connected</span>
          <span v-else-if="pluginStatus.status === 'configured'">Action Required</span>
          <span v-else>Not Configured</span>
        </span>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fabric-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        :style="{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>

    <!-- Expanded Configuration -->
    <div v-if="isOpen" class="p-3 border-t border-fabric-border" style="background: var(--fabric-bg-elevated);">
      <PluginMenuAuth :plugin-id="pluginId" />
    </div>
  </div>
</template>
