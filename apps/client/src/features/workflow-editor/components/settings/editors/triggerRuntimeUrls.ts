export function buildTriggerFormTestUrl(publicOrigin: string, formPublicId: string): string {
  const id = formPublicId.trim()
  if (!id) return ''
  return `${publicOrigin.replace(/\/$/, '')}/forms-test/${id}`
}

export function buildTriggerFormProdUrl(
  publicOrigin: string,
  formPublicId: string,
  profileId?: string,
): string {
  const id = formPublicId.trim()
  if (!id) return ''
  const profile = profileId?.trim()
  if (profile) {
    return `${publicOrigin.replace(/\/$/, '')}/p/${encodeURIComponent(profile)}/forms/${id}`
  }
  return `${publicOrigin.replace(/\/$/, '')}/forms/${id}`
}

export function buildTriggerWebhookProdUrl(
  publicOrigin: string,
  webhookPath: string,
  profileId?: string,
): string {
  const path = webhookPath.trim()
  if (!path) return ''
  const profile = profileId?.trim()
  if (profile) {
    return `${publicOrigin.replace(/\/$/, '')}/p/${encodeURIComponent(profile)}/webhook/${path}`
  }
  return `${publicOrigin.replace(/\/$/, '')}/webhook/${path}`
}
