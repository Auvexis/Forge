export type SidebarAccent = `#${string}`

export interface SidebarNavItem {
  id: string
  label: string
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
        description: 'Create, edit, and manage your automated workflows visually.',
        icon: 'workflow',
        accent: '#34d399',
        route: '/workflows',
      },
      {
        id: 'agents',
        label: 'Agents',
        description: 'Create, edit, and manage your AI agents.',
        icon: 'bot',
        accent: '#60a5fa',
        route: '/agents',
      },
      {
        id: 'chat',
        label: 'Chat',
        description: 'Build internal chat tools, AI assistants, and conversational apps.',
        icon: 'message-circle',
        accent: '#38bdf8',
        route: '/chat',
      },
      {
        id: 'forms',
        label: 'Forms',
        description: 'Create forms, surveys, and input-driven apps for your workflows.',
        icon: 'clipboard-list',
        accent: '#f59e0b',
        route: '/forms',
      },
      {
        id: 'tables',
        label: 'Tables',
        description: 'Create database-like tables for storing and managing operational data.',
        icon: 'table-2',
        accent: '#84cc16',
        route: '/tables',
      },
      {
        id: 'dashboards',
        label: 'Dashboards',
        description: 'Create visual dashboards for metrics, reports, and business insights.',
        icon: 'layout-dashboard',
        accent: '#818cf8',
        route: '/dashboards',
      },
      {
        id: 'knowledge',
        label: 'Knowledge',
        description: 'Create searchable knowledge bases for documents, teams, and AI agents.',
        icon: 'book-open-text',
        accent: '#a78bfa',
        route: '/knowledge',
      },
      {
        id: 'storage',
        label: 'Storage',
        description: 'Store, organize, and process files used across your workspace.',
        icon: 'folder-open',
        accent: '#eab308',
        route: '/storage',
      },
      {
        id: 'api',
        label: 'API',
        description: 'Create internal APIs, mock endpoints, and backend utilities.',
        icon: 'braces',
        accent: '#14b8a6',
        route: '/api',
      },
      {
        id: 'scheduler',
        label: 'Scheduler',
        description: 'Create scheduled jobs, recurring tasks, and timed automations.',
        icon: 'calendar-clock',
        accent: '#fb7185',
        route: '/scheduler',
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        description: 'Monitor uptime, jobs, services, automations, and system health.',
        icon: 'activity',
        accent: '#10b981',
        route: '/monitoring',
      },
      {
        id: 'browser',
        label: 'Browser',
        description: 'Run browser-based automations, scraping tasks, and web interactions.',
        icon: 'globe',
        accent: '#0ea5e9',
        route: '/browser',
      },
      {
        id: 'email',
        label: 'Email',
        description: 'Build email-based automations, inbox tools, and campaign utilities.',
        icon: 'mail',
        accent: '#ef4444',
        route: '/email',
      },
      {
        id: 'crm',
        label: 'CRM',
        description: 'Manage contacts, leads, pipelines, and customer interactions.',
        icon: 'contact',
        accent: '#f97316',
        route: '/crm',
      },
      {
        id: 'canvas',
        label: 'Canvas',
        description: 'Design visual apps, interfaces, diagrams, and internal tools.',
        icon: 'panel-top',
        accent: '#ec4899',
        route: '/canvas',
      },
      {
        id: 'database',
        label: 'Database',
        description: 'Create and manage databases for apps, automations, and agents.',
        icon: 'database',
        accent: '#22c55e',
        route: '/database',
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

export const sidebarProfileIcon = 'grip'

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

export function dispatchSidebarNavIntent(item: SidebarNavItem): boolean {
  if (!item.intent) return false

  window.dispatchEvent(new CustomEvent('sailor:command-palette:intent', { detail: item.intent }))
  return true
}
