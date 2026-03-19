# Advanced Usage

## Custom HTTP client

You can inject your own HTTP transport by implementing the `HttpClient` interface. This is useful for:

- Unit testing without network calls
- Adding custom headers (e.g., tracing, proxies)
- Using a different HTTP library (e.g., `axios`, `got`)

```ts
import type { HttpClient, HttpRequest, HttpResponse } from 'tiny-erp-client'

class MyHttpClient implements HttpClient {
  async request<T>(config: HttpRequest): Promise<HttpResponse<T>> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: { 'Content-Type': 'application/json' },
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json() as T
    return { data, status: response.status }
  }
}

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir',
  httpClient: new MyHttpClient(),
})
```

## HttpClient interface

```ts
interface HttpRequest {
  url: string
  method: 'GET' | 'POST' | 'PUT'
  body?: unknown
}

interface HttpResponse<T> {
  data: T
  status: number
}

interface HttpClient {
  request<T>(config: HttpRequest): Promise<HttpResponse<T>>
}
```

## Testing with a mock HTTP client

Use a stub transport to test your application code without hitting the Tiny API:

```ts
import { TinyClient, type HttpClient, type HttpRequest, type HttpResponse } from 'tiny-erp-client'

class StubHttpClient implements HttpClient {
  constructor(private responses: Map<string, unknown>) {}

  async request<T>(config: HttpRequest): Promise<HttpResponse<T>> {
    // Match by path fragment
    for (const [key, value] of this.responses) {
      if (config.url.includes(key)) {
        return { data: value as T, status: 200 }
      }
    }
    throw new Error(`No stub for ${config.url}`)
  }
}

const stub = new StubHttpClient(new Map([
  ['produto.obter', {
    retorno: {
      status: 'OK',
      produto: {
        id: '123',
        nome: 'Camiseta',
        situacao: 'A',
      },
    },
  }],
]))

const client = new TinyClient({
  token: 'test-token',
  plan: 'Evoluir',
  httpClient: stub,
})

const product = await client.products.getProduct('123')
console.log(product.name)   // 'Camiseta'
console.log(product.status) // 'active'
```

## Using with msw (Mock Service Worker)

For integration tests, [msw](https://mswjs.io/) intercepts `fetch` calls at the network level:

```ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { TinyClient } from 'tiny-erp-client'

const server = setupServer(
  http.get('https://api.tiny.com.br/api2/produto.obter', () =>
    HttpResponse.json({
      retorno: {
        status: 'OK',
        produto: { id: '123', nome: 'Camiseta', situacao: 'A' },
      },
    })
  )
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('getProduct returns mapped product', async () => {
  const client = new TinyClient({ token: 'tok', plan: 'Evoluir' })
  const product = await client.products.getProduct('123')
  expect(product.name).toBe('Camiseta')
  expect(product.status).toBe('active')
})
```

## Environment variable patterns

### dotenv

```ts
import 'dotenv/config'
import { TinyClient } from 'tiny-erp-client'

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: (process.env.TINY_PLAN ?? 'Evoluir') as TinyPlan,
})
```

### Validation with zod

```ts
import { z } from 'zod'
import { TinyClient, type TinyPlan } from 'tiny-erp-client'

const env = z.object({
  TINY_TOKEN: z.string().min(1),
  TINY_PLAN: z.enum(['Começar', 'Crescer', 'Evoluir', 'Potencializar']),
}).parse(process.env)

const client = new TinyClient({
  token: env.TINY_TOKEN,
  plan: env.TINY_PLAN,
})
```
