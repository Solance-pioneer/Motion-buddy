/** Source width of 720 or more is HD. The 480-wide films stay SD. */
export function clipDefinition(width: number): 'HD' | 'SD' {
  return width >= 720 ? 'HD' : 'SD'
}
