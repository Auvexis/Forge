<template>
  <div class="web-page-project-topbar">
    <AppDropdownMenu
      ref="projectMenuRef"
      position="bottom-start"
      :offset="3"
      max-height="350px"
      @open="handleOpen"
      @close="isProjectMenuOpen = false"
    >
      <template #trigger>
        <button
          class="web-page-project-topbar__trigger"
          :class="{ 'web-page-project-topbar__trigger--open': isProjectMenuOpen }"
          type="button"
        >
          <span>{{ activeProject?.name ?? 'Pages' }}</span>
          <LucideIcon class="web-page-project-topbar__chevron" name="chevron-down" :size="13" />
        </button>
      </template>

      <template #fixed>
        <div class="web-page-project-topbar__search">
          <BaseInput
            v-model="searchQuery"
            icon-left="search"
            placeholder="Search projects..."
            @click.stop
          />
        </div>
        <AppDropdownDivider />
      </template>

      <template v-if="filteredProjects.length > 0">
        <AppDropdownItem
          v-for="project in filteredProjects"
          :key="project.id"
          icon="files"
          :label="project.name"
          :disabled="project.id === activeProject?.id"
          @click="emit('select-project', project.id)"
        >
          <template #element>
            <div class="web-page-project-topbar__option">
              <span>{{ project.slug }}</span>
              <span>{{ project.files.length }} files</span>
            </div>
          </template>
        </AppDropdownItem>
      </template>

      <div v-else class="web-page-project-topbar__empty">
        No projects match "{{ searchQuery }}"
      </div>
    </AppDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FabricSite } from '../types/page.types'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  activeProject?: FabricSite | null
  projects: FabricSite[]
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'select-project', projectId: string): void
}>()

const projectMenuRef = ref<InstanceType<typeof AppDropdownMenu> | null>(null)
const searchQuery = ref('')
const isProjectMenuOpen = ref(false)

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.projects
  return props.projects.filter((project) =>
    `${project.name} ${project.slug} ${project.id}`.toLowerCase().includes(query),
  )
})

function handleOpen() {
  isProjectMenuOpen.value = true
  emit('open')
}

defineExpose({
  openProjectMenu: () => projectMenuRef.value?.open(),
})
</script>
