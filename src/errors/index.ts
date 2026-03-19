export class TinyApiError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(message: string, code: string, details?: unknown) {
    super(message)
    this.name = 'TinyApiError'
    this.code = code
    this.details = details
  }
}

export class TinyRateLimitError extends TinyApiError {
  constructor(retryAfterMs?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfterMs })
    this.name = 'TinyRateLimitError'
  }
}

export class TinyTransportError extends TinyApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSPORT_ERROR', details)
    this.name = 'TinyTransportError'
  }
}

export class TinyMappingError extends TinyApiError {
  constructor(field: string, details?: unknown) {
    super(`Failed to map field: ${field}`, 'MAPPING_ERROR', details)
    this.name = 'TinyMappingError'
  }
}
