export interface BlueprintComponentsTreeItemModel {
  id: string
  name: string
  treeId: string
  icon: string
  accent?: string
  kind: 'group' | 'component' | 'node'
  nodeId?: string
  componentId?: string
  children: BlueprintComponentsTreeItemModel[]
}
