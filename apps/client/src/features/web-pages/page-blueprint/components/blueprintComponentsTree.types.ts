export interface BlueprintComponentsTreeItemModel {
  id: string
  label: string
  detail: string
  icon: string
  accent?: string
  kind: 'group' | 'component' | 'node'
  nodeId?: string
  componentId?: string
  children: BlueprintComponentsTreeItemModel[]
}
