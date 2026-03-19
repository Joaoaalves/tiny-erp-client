import type { HttpClient, HttpRequest, HttpResponse } from '../types/http'
import { TinyApiError, TinyTransportError } from '../errors'
import { sanitizeUrl } from './sanitize'

export class FetchHttpClient implements HttpClient {
  async request<T>(config: HttpRequest): Promise<HttpResponse<T>> {
    let response: Response

    try {
      response = await fetch(config.url, {
        method: config.method,
        headers: config.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      })
    } catch (cause) {
      throw new TinyTransportError(
        `Network request failed: ${sanitizeUrl(config.url)}`,
        cause instanceof Error ? cause.message : String(cause),
      )
    }

    let data: T
    try {
      data = (await response.json()) as T
    } catch (cause) {
      throw new TinyTransportError(
        `Failed to parse response from: ${sanitizeUrl(config.url)}`,
        cause instanceof Error ? cause.message : String(cause),
      )
    }

    if (!response.ok) {
      throw new TinyApiError(
        `HTTP ${response.status} at ${sanitizeUrl(config.url)}`,
        `HTTP_${response.status}`,
        data,
      )
    }

    return { status: response.status, data }
  }
}
