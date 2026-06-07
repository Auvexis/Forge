export type WorkflowGitDiffLineType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface WorkflowGitDiffLine {
  type: WorkflowGitDiffLineType
  oldLineNumber: number | null
  newLineNumber: number | null
  content: string
  oldContent?: string
}

export function buildWorkflowJsonDiff(oldText: string, newText: string): WorkflowGitDiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const lcs = buildLcsTable(oldLines, newLines)
  const lines: WorkflowGitDiffLine[] = []
  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        content: newLines[newIndex] ?? '',
      })
      oldIndex++
      newIndex++
      continue
    }

    const shouldRemove = lcs[oldIndex + 1]?.[newIndex] ?? 0
    const shouldAdd = lcs[oldIndex]?.[newIndex + 1] ?? 0
    if (shouldRemove >= shouldAdd) {
      if (newIndex < newLines.length && shouldAdd === shouldRemove) {
        lines.push({
          type: 'modified',
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: newLines[newIndex] ?? '',
          oldContent: oldLines[oldIndex] ?? '',
        })
        oldIndex++
        newIndex++
      } else {
        lines.push({
          type: 'removed',
          oldLineNumber: oldIndex + 1,
          newLineNumber: null,
          content: oldLines[oldIndex] ?? '',
        })
        oldIndex++
      }
    } else {
      lines.push({
        type: 'added',
        oldLineNumber: null,
        newLineNumber: newIndex + 1,
        content: newLines[newIndex] ?? '',
      })
      newIndex++
    }
  }

  while (oldIndex < oldLines.length) {
    lines.push({
      type: 'removed',
      oldLineNumber: oldIndex + 1,
      newLineNumber: null,
      content: oldLines[oldIndex] ?? '',
    })
    oldIndex++
  }

  while (newIndex < newLines.length) {
    lines.push({
      type: 'added',
      oldLineNumber: null,
      newLineNumber: newIndex + 1,
      content: newLines[newIndex] ?? '',
    })
    newIndex++
  }

  return lines
}

function buildLcsTable(oldLines: string[], newLines: string[]) {
  const table = Array.from({ length: oldLines.length + 1 }, () =>
    Array.from({ length: newLines.length + 1 }, () => 0),
  )

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex--) {
      table[oldIndex]![newIndex] = oldLines[oldIndex] === newLines[newIndex]
        ? (table[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
        : Math.max(table[oldIndex + 1]?.[newIndex] ?? 0, table[oldIndex]?.[newIndex + 1] ?? 0)
    }
  }

  return table
}
