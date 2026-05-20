export type SidebarAccent = `#${string}`

export interface SidebarNavItem {
  id: string
  label: string
  pageLabel?: string
  description: string
  icon: string
  accent: SidebarAccent
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
        route: '/workflows',
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        description: 'Monitor uptime, jobs, services, automations, and system health.',
        icon: 'activity',
        accent: '#10b981',
        intent: { type: 'monitoring.open' },
      },
      {
        id: 'universe',
        label: 'Universe',
        description:
          'Explore your node ecosystem in an immersive 3D space for integrations and dependencies.',
        icon: 'orbit',
        accent: '#8a52ff',
        route: '/universe',
      },
    ],
  },
  {
    label: 'Plugins',
    items: [
      {
        id: 'plugin-external-installer',
        label: 'Installer',
        description: 'Install plugins from the external repository or local files.',
        icon: 'package',
        accent: '#8a52ff',
        intent: { type: 'plugin-installer.open' },
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
  },
  {
    id: 'monitor',
    label: 'Run and Debug',
    description: 'View workflow executions, active runs, and recent errors.',
    icon: 'activity',
  },
  {
    id: 'docs',
    label: 'Documentation',
    description: 'Read the official documentation for building and operating workflows.',
    icon: 'book',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage preferences, credentials, environment variables, and connections.',
    icon: 'settings',
  },
]

export const sidebarMainUsesWoobyMenu = false

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
  return isCollapsed ? 'var(--sailor-sidebar-width)' : 'var(--sailor-sidebar-expanded)'
}

export function sidebarPageLabelForPath(path: string): string {
  const items = sidebarSections.flatMap((section) => section.items)
  const activeItem = items
    .filter((item) => item.route && path.startsWith(item.route))
    .sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0))[0]

  return activeItem?.pageLabel ?? activeItem?.label ?? 'Sailor'
}

export function dispatchSidebarNavIntent(item: SidebarNavItem): boolean {
  if (!item.intent) return false

  window.dispatchEvent(new CustomEvent('sailor:command-palette:intent', { detail: item.intent }))
  return true
}
