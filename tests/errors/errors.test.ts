import { describe, it, expect } from 'vitest'
import {
  TinyApiError,
  TinyRateLimitError,
  TinyTransportError,
  TinyMappingError,
} from '../../src/errors'

describe('TinyApiError', () => {
  it('sets name, message, code, and details', () => {
    const error = new TinyApiError('something went wrong', 'SOME_CODE', { foo: 'bar' })
    expect(error.name).toBe('TinyApiError')
    expect(error.message).toBe('something went wrong')
    expect(error.code).toBe('SOME_CODE')
    expect(error.details).toEqual({ foo: 'bar' })
  })

  it('is an instance of Error', () => {
    const error = new TinyApiError('msg', 'CODE')
    expect(error).toBeInstanceOf(Error)
  })

  it('allows details to be undefined', () => {
    const error = new TinyApiError('msg', 'CODE')
    expect(error.details).toBeUndefined()
  })
})

describe('TinyRateLimitError', () => {
  it('sets name and RATE_LIMIT_EXCEEDED code', () => {
    const error = new TinyRateLimitError()
    expect(error.name).toBe('TinyRateLimitError')
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('is an instance of TinyApiError', () => {
    const error = new TinyRateLimitError()
    expect(error).toBeInstanceOf(TinyApiError)
  })

  it('stores retryAfterMs in details when provided', () => {
    const error = new TinyRateLimitError(5000)
    expect(error.details).toEqual({ retryAfterMs: 5000 })
  })

  it('stores undefined retryAfterMs when not provided', () => {
    const error = new TinyRateLimitError()
    expect(error.details).toEqual({ retryAfterMs: undefined })
  })
})

describe('TinyTransportError', () => {
  it('sets name and TRANSPORT_ERROR code', () => {
    const error = new TinyTransportError('network failure')
    expect(error.name).toBe('TinyTransportError')
    expect(error.code).toBe('TRANSPORT_ERROR')
  })

  it('is an instance of TinyApiError', () => {
    const error = new TinyTransportError('msg')
    expect(error).toBeInstanceOf(TinyApiError)
  })

  it('stores details when provided', () => {
    const error = new TinyTransportError('msg', 'underlying cause')
    expect(error.details).toBe('underlying cause')
  })
})

describe('TinyMappingError', () => {
  it('sets name and MAPPING_ERROR code', () => {
    const error = new TinyMappingError('nome')
    expect(error.name).toBe('TinyMappingError')
    expect(error.code).toBe('MAPPING_ERROR')
  })

  it('is an instance of TinyApiError', () => {
    const error = new TinyMappingError('campo')
    expect(error).toBeInstanceOf(TinyApiError)
  })

  it('includes field name in the error message', () => {
    const error = new TinyMappingError('peso')
    expect(error.message).toContain('peso')
  })

  it('stores details when provided', () => {
    const error = new TinyMappingError('campo', { raw: null })
    expect(error.details).toEqual({ raw: null })
  })
})
