const TOKEN_PATTERN = /([?&]token=)[^&#]*/g

export function sanitizeUrl(url: string): string {
  return url.replace(TOKEN_PATTERN, '$1***')
}
