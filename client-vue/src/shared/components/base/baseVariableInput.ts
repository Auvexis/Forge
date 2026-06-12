export function insertDroppedText(
  value: string,
  token: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
): string {
  const start = selectionStart ?? value.length
  const end = selectionEnd ?? selectionStart ?? value.length
  return `${value.slice(0, start)}${token}${value.slice(end)}`
}
