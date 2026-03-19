export interface HttpRequest {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export interface HttpResponse<T> {
  status: number
  data: T
}

export interface HttpClient {
  request<T>(config: HttpRequest): Promise<HttpResponse<T>>
}
