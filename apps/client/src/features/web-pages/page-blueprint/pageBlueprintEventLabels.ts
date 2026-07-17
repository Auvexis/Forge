export function createBlueprintEventLabel(eventType?: string) {
  return `On ${formatEventType(eventType || 'click')}`
}

function formatEventType(eventType: string) {
  const normalized = eventType.replace(/^on[-_\s]*/i, '').replace(/[_-]+/g, ' ').trim()
  if (!normalized) return 'Click'
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
