export type WorkflowChromeCommandId =
  | 'file.new'
  | 'file.open'
  | 'file.import'
  | 'file.export'
  | 'file.save'
  | 'file.close'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.duplicate-selection'
  | 'edit.delete-selection'
  | 'view.zoom-out'
  | 'view.zoom-in'
  | 'view.zoom-reset'
  | 'view.fit'
  | 'view.logs'
  | 'select.all'
  | 'select.clear'
  | 'go.add-node'
  | 'go.variables'
  | 'go.settings'
  | 'go.command-palette'
  | 'run.workflow'
  | 'run.stop'
  | 'run.clean-execution'
  | 'run.publish'
  | 'git.create-snapshot'
  | 'git.refresh-status'
  | 'git.copy-repo-path'
  | 'help.shortcuts'
  | 'help.docs'
  | 'help.about'

export interface WorkflowChromeMenuItem {
  id: WorkflowChromeCommandId
  label: string
  icon?: string
  disabledReason?: string
}

export interface WorkflowChromeMenu {
  id: 'file' | 'edit' | 'view' | 'select' | 'go' | 'run' | 'git' | 'help'
  label: string
  items: WorkflowChromeMenuItem[]
}

export interface WorkflowChromeToolbarAction {
  id: WorkflowChromeCommandId
  label: string
  icon: string
  kind?: 'button' | 'primary' | 'danger' | 'toggle'
}

export interface WorkflowChromeToolbarGroup {
  id: 'history' | 'canvas' | 'insert' | 'workflow' | 'execution' | 'save'
  actions: WorkflowChromeToolbarAction[]
}

export type WorkflowChromeActionOverrides = Partial<
  Record<WorkflowChromeCommandId, Partial<Pick<WorkflowChromeMenuItem, 'label' | 'icon'>>>
>
