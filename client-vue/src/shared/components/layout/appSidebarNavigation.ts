export type SidebarAccent = 'blue' | 'violet' | 'green' | 'amber'

export interface SidebarNavItem {
  id: string
  label: string
  description: string
  icon: string
  accent: SidebarAccent
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
        description: 'Create, edit, and manage your automated workflows visually.',
        icon: 'workflow',
        accent: 'blue',
      },
    ],
  },
  {
    label: 'Spaces',
    items: [
      {
        id: 'universe',
        label: 'Universe',
        description:
          'Explore your node ecosystem in an immersive 3D space for integrations and dependencies.',
        icon: 'orbit',
        accent: 'violet',
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

export const sidebarChromeLayout = {
  topbarHasBottomBorder: true,
  sidebarSeparatorStartsBelowHeader: true,
} as const

export function sidebarWidthForState(
  isCollapsed: boolean,
  options: { expandedPx?: number } = {},
): string {
  if (!isCollapsed && options.expandedPx) return `${options.expandedPx}px`
  return isCollapsed ? 'var(--nod8-sidebar-width)' : 'var(--nod8-sidebar-expanded)'
}
