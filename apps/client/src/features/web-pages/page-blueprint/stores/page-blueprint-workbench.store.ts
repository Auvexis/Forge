import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { PageBlueprintDocumentTab, PageBlueprintScope } from '../pageBlueprint.types.ts'
import { blueprintScopeId, blueprintScopeLabel } from '../pageBlueprintDocument.ts'

export const usePageBlueprintWorkbenchStore = defineStore('web-page-blueprint-workbench', () => {
  const activeTabId = ref('design')
  const openBlueprintScopes = ref<PageBlueprintScope[]>([])

  const tabs = computed<PageBlueprintDocumentTab[]>(() => [
    {
      id: 'design',
      kind: 'design',
      label: 'Design',
      icon: 'layout-template',
      closable: false,
    },
    {
      id: 'code',
      kind: 'code',
      label: 'Code',
      icon: 'code-2',
      closable: false,
    },
    ...openBlueprintScopes.value.map((scope) => ({
      id: blueprintScopeId(scope),
      kind: 'blueprint' as const,
      label: blueprintScopeLabel(scope),
      detail: scope.type,
      icon: 'workflow',
      closable: true,
      scope,
    })),
  ])

  const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeTabId.value) ?? tabs.value[0])
  const activeBlueprintScope = computed(() => activeTab.value?.scope ?? null)

  function activateTab(tabId: string) {
    activeTabId.value = tabId
  }

  function openBlueprint(scope: PageBlueprintScope) {
    const pageScope: PageBlueprintScope = { type: 'page', pageId: scope.pageId }
    const id = blueprintScopeId(pageScope)
    if (!openBlueprintScopes.value.some((candidate) => blueprintScopeId(candidate) === id)) {
      openBlueprintScopes.value = [...openBlueprintScopes.value, pageScope]
    }
    activeTabId.value = id
  }

  function closeTab(tabId: string) {
    openBlueprintScopes.value = openBlueprintScopes.value.filter((scope) => blueprintScopeId(scope) !== tabId)
    if (activeTabId.value === tabId) activeTabId.value = 'design'
  }

  function resetForPage(pageId: string | null | undefined) {
    if (!pageId) {
      openBlueprintScopes.value = []
      activeTabId.value = 'design'
      return
    }
    const pageScope: PageBlueprintScope = { type: 'page', pageId }
    openBlueprintScopes.value = [pageScope]
    activeTabId.value = 'design'
  }

  return {
    activeTabId,
    openBlueprintScopes,
    tabs,
    activeTab,
    activeBlueprintScope,
    activateTab,
    openBlueprint,
    closeTab,
    resetForPage,
  }
})
