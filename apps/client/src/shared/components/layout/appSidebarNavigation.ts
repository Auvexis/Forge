export type SidebarAccent = `#${string}`

export interface SidebarNavItem {
  id: string
  label: string
  pageLabel?: string
  description: string
  icon: string
  accent: SidebarAccent
  hintId?: string
  route?: string
  intent?: SidebarNavIntent
}

export interface SidebarNavIntent {
  type: string
  target?: string
  payload?: Record<string, unknown>
}

export interface SidebarSection {
  label: string
  items: SidebarNavItem[]
}

export interface SidebarActivityItem {
  id: string
  label: string
  description: string
  icon: string
  hintId?: string
  intent?: SidebarNavIntent
}

export const sidebarSections: SidebarSection[] = [
  {
    label: 'Apps',
    items: [
      {
        id: 'workflows',
        label: 'Workflows',
        pageLabel: 'Workflow',
        description: 'Create, edit, and manage your automated workflows visually.',
        icon: 'workflow',
        accent: '#34d399',
        hintId: 'workflows',
        route: '/workflows',
      },
      {
        id: 'agents',
        label: 'Agents',
        pageLabel: 'Agents',
        description: 'Chat with published workflow agents across your profile.',
        icon: 'bot',
        accent: '#f59e0b',
        hintId: 'agents',
        intent: { type: 'agent-panel.open' },
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        description: 'Monitor uptime, jobs, services, automations, and system health.',
        icon: 'activity',
        accent: '#10b981',
        hintId: 'monitoring',
        intent: { type: 'monitoring.open' },
      },
      {
        id: 'plugin-external-installer',
        label: 'Installer',
        description: 'Install plugins from the external repository or local files.',
        icon: 'package',
        accent: '#8a52ff',
        hintId: 'plugin-external-installer',
        intent: { type: 'plugin-installer.open' },
      },
    ],
  },
  {
    label: 'Labs',
    items: [
      {
        id: 'pages',
        label: 'Pages',
        pageLabel: 'Pages',
        description: 'Create and publish profile-scoped workflow-connected sites.',
        icon: 'panel-top',
        accent: '#60a5fa',
        hintId: 'pages',
        route: '/pages',
      },
      {
        id: 'universe',
        label: 'Universe',
        description:
          'Explore your node ecosystem in an immersive 3D space for integrations and dependencies.',
        icon: 'orbit',
        accent: '#8a52ff',
        hintId: 'universe',
        route: '/universe',
      },
    ],
  },
]

export const sidebarActivityItems: SidebarActivityItem[] = [
  {
    id: 'search',
    label: 'Search',
    description: 'Open the command palette to find workflows, commands, and actions.',
    icon: 'search',
    hintId: 'search',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage preferences, credentials, environment variables, and connections.',
    icon: 'settings',
    hintId: 'settings',
  },
]


export const sidebarMainActiveStyle = {
  hidesInheritedBeforeIndicator: true,
  usesTextUnderline: true,
} as const

export const sidebarReferenceSpacing = {
  headerHeightPx: 58,
  horizontalPaddingPx: 18,
  dividerInsetPx: 12,
  mainTopPaddingPx: 24,
  sectionGapPx: 30,
  sectionLabelToGridPx: 22,
  itemColumnGapPx: 58,
  itemRowGapPx: 22,
  gridColumns: 'stretch',
} as const

export const sidebarChromeLayout = {
  topbarHasBottomBorder: true,
  sidebarSeparatorStartsBelowHeader: true,
} as const

export function sidebarWidthForState(
  isCollapsed: boolean,
  options: { expandedPx?: number } = {},
): string {
  if (!isCollapsed && options.expandedPx) return `${options.expandedPx}px`
  return isCollapsed ? 'var(--fabric-sidebar-width)' : 'var(--fabric-sidebar-expanded)'
}

export function sidebarPageLabelForPath(path: string): string {
  if (path === '/home') return 'Home'

  const items = sidebarSections.flatMap((section) => section.items)
  const activeItem = items
    .filter((item) => item.route && path.startsWith(item.route))
    .sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0))[0]

  return activeItem?.pageLabel ?? activeItem?.label ?? 'Fabric'
}

export function dispatchSidebarNavIntent(item: { intent?: SidebarNavIntent }): boolean {
  if (!item.intent) return false

  window.dispatchEvent(new CustomEvent('fabric:command-palette:intent', { detail: item.intent }))
  return true
}
