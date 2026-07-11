import type { WorkflowChromeMenu, WorkflowChromeToolbarGroup } from './workflowChrome.types'

export const workflowChromeMenus: WorkflowChromeMenu[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.new', label: 'New Workflow', icon: 'plus-circle' },
      { id: 'file.open', label: 'Open Workflow', icon: 'folder-open' },
      { id: 'file.import', label: 'Import JSON', icon: 'cloud-upload' },
      { id: 'file.export', label: 'Export JSON', icon: 'download' },
      { id: 'file.save', label: 'Save', icon: 'save' },
      { id: 'file.close', label: 'Close Editor', icon: 'x' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo-2' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo-2' },
      { id: 'edit.duplicate-selection', label: 'Duplicate Selection', icon: 'copy' },
      { id: 'edit.delete-selection', label: 'Delete Selection', icon: 'trash-2' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'view.zoom-out', label: 'Zoom Out', icon: 'zoom-out' },
      { id: 'view.zoom-in', label: 'Zoom In', icon: 'zoom-in' },
      { id: 'view.zoom-reset', label: 'Reset Zoom', icon: 'rotate-ccw' },
      { id: 'view.fit', label: 'Fit View', icon: 'maximize' },
      { id: 'view.logs', label: 'Logs', icon: 'scroll-text' },
    ],
  },
  {
    id: 'select',
    label: 'Select',
    items: [
      { id: 'select.all', label: 'Select All Nodes', icon: 'mouse-pointer-square-dashed' },
      { id: 'select.clear', label: 'Clear Selection', icon: 'eraser' },
    ],
  },
  {
    id: 'go',
    label: 'Go',
    items: [
      { id: 'go.add-node', label: 'Add Node', icon: 'plus' },
      { id: 'go.variables', label: 'Variables', icon: 'tags' },
      { id: 'go.settings', label: 'Workflow Settings', icon: 'settings' },
      { id: 'go.command-palette', label: 'Command Palette', icon: 'command' },
    ],
  },
  {
    id: 'run',
    label: 'Run',
    items: [
      { id: 'run.workflow', label: 'Run Workflow', icon: 'play' },
      { id: 'run.stop', label: 'Stop Run', icon: 'square' },
      { id: 'run.publish', label: 'Publish Workflow', icon: 'radio' },
    ],
  },
  {
    id: 'git',
    label: 'Git',
    items: [
      { id: 'git.create-snapshot', label: 'Create Snapshot', icon: 'git-commit-horizontal' },
      { id: 'git.refresh-status', label: 'Refresh Status', icon: 'refresh-cw' },
      { id: 'git.copy-repo-path', label: 'Copy Repo Path', icon: 'copy' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      {
        id: 'help.shortcuts',
        label: 'Keyboard Shortcuts',
        icon: 'keyboard',
        disabledReason: 'Shortcuts panel is not built yet',
      },
      {
        id: 'help.docs',
        label: 'FABRIC Docs',
        icon: 'book-open',
        disabledReason: 'Docs route is not available yet',
      },
      {
        id: 'help.about',
        label: 'About Workflow Editor',
        icon: 'info',
        disabledReason: 'About panel is not available yet',
      },
    ],
  },
]

export const workflowChromeToolbarGroups: WorkflowChromeToolbarGroup[] = [
  {
    id: 'history',
    actions: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo-2' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo-2' },
    ],
  },
  {
    id: 'canvas',
    actions: [
      { id: 'view.zoom-out', label: 'Zoom out', icon: 'zoom-out' },
      { id: 'view.zoom-reset', label: 'Reset zoom', icon: 'rotate-ccw' },
      { id: 'view.zoom-in', label: 'Zoom in', icon: 'zoom-in' },
      { id: 'view.fit', label: 'Fit view', icon: 'maximize' },
    ],
  },
  {
    id: 'insert',
    actions: [{ id: 'go.add-node', label: 'Add node', icon: 'plus', kind: 'button' }],
  },
  {
    id: 'workflow',
    actions: [
      { id: 'go.variables', label: 'Variables', icon: 'tags' },
      { id: 'go.settings', label: 'Settings', icon: 'settings' },
      { id: 'view.logs', label: 'Logs', icon: 'scroll-text' },
    ],
  },
  {
    id: 'execution',
    actions: [
      { id: 'run.workflow', label: 'Run', icon: 'play', kind: 'primary' },
      { id: 'run.stop', label: 'Stop', icon: 'square', kind: 'danger' },
      { id: 'run.clean-execution', label: 'Clean Execution', icon: 'eraser' },
    ],
  },
  {
    id: 'save',
    actions: [
      { id: 'run.publish', label: 'Publish', icon: 'radio' },
      { id: 'file.save', label: 'Save', icon: 'save' },
    ],
  },
]
