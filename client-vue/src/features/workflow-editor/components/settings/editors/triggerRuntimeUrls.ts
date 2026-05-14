export function buildTriggerFormTestUrl(publicOrigin: string, formPublicId: string): string {
  const id = formPublicId.trim()
  if (!id) return ''
  return `${publicOrigin.replace(/\/$/, '')}/forms-test/${id}`
}

export function buildTriggerFormProdUrl(publicOrigin: string, formPublicId: string): string {
  const id = formPublicId.trim()
  if (!id) return ''
  return `${publicOrigin.replace(/\/$/, '')}/forms/${id}`
}
