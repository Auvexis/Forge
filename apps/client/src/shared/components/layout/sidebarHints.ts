import type { AppHintContent } from '@/shared/components/hints/AppHint.types'

export const sidebarHintById = {
  workflows: {
    title: 'Workflows',
    description: 'Create, edit, and manage your automated workflows visually.',
    position: 'right',
  },
  pages: {
    title: 'Pages',
    description: 'Create and publish profile-scoped workflow-connected sites.',
    position: 'right',
  },
  agents: {
    title: 'Agents',
    description: 'Chat with published workflow agents across your profile.',
    position: 'right',
  },
  monitoring: {
    title: 'Monitoring',
    description: 'Monitor uptime, jobs, services, automations, and system health.',
    position: 'right',
  },
  universe: {
    title: 'Universe',
    description: 'Explore your node ecosystem in an immersive 3D space.',
    position: 'right',
  },
  'plugin-external-installer': {
    title: 'Installer',
    description: 'Install plugins from the external repository or local files.',
    position: 'right',
  },
  search: {
    title: 'Search',
    description: 'Open the command palette to find workflows, commands, and actions.',
    position: 'right',
  },
  monitor: {
    title: 'Run and Debug',
    description: 'View workflow executions, active runs, and recent errors.',
    position: 'right',
  },
  docs: {
    title: 'Guide Book',
    description: 'Browse and replay Fabric guides for tools, pages, and workflows.',
    position: 'right',
  },
  settings: {
    title: 'Settings',
    description: 'Manage preferences, credentials, environment variables, and connections.',
    position: 'right',
  },
} satisfies Record<string, AppHintContent>
