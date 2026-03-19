import type { HttpClient } from '../types/http'
import type { RateLimiter } from '../types/rate-limit'

const BASE_URL = 'https://api.tiny.com.br/api2'

export interface ExecutorRequest {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, string>
  /** Mutation payload: each entry is JSON-encoded and appended as a query param. */
  queryBody?: Record<string, unknown>
  body?: unknown
}

export class RequestExecutor {
  constructor(
    private readonly token: string,
    private readonly httpClient: HttpClient,
    private readonly rateLimiter: RateLimiter,
  ) {}

  async execute<T>(request: ExecutorRequest): Promise<T> {
    await this.rateLimiter.acquire()

    const url = this.buildUrl(request.path, request.params, request.queryBody)

    const response = await this.httpClient.request<T>({
      url,
      method: request.method,
      body: request.queryBody !== undefined ? undefined : request.body,
    })

    return response.data
  }

  private buildUrl(
    path: string,
    params?: Record<string, string>,
    queryBody?: Record<string, unknown>,
  ): string {
    const query = new URLSearchParams({ token: this.token, formato: 'json', ...params })
    if (queryBody) {
      for (const [key, value] of Object.entries(queryBody)) {
        query.set(key, JSON.stringify(value))
      }
    }
    return `${BASE_URL}${path}?${query.toString()}`
  }
}
