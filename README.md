# tiny-erp-client

A high-performance, fully typed TypeScript client for the [Tiny ERP](https://tiny.com.br) API.

- **Strictly typed** — no `any`, full IntelliSense on every field
- **English field names** — all Portuguese API fields are translated automatically
- **Plan-aware rate limiting** — token bucket queue respects your Tiny plan's limits
- **Safe by design** — your API token never appears in logs, errors, or stack traces
- **Zero runtime dependencies**

---

## Installation

```bash
npm install tiny-erp-client
```

Requires **Node.js ≥ 18**.

---

## Quick Start

```ts
import { TinyClient } from 'tiny-erp-client'

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir',
})

// Search products
const { products, page, numberOfPages } = await client.products.searchProducts({
  query: 'camiseta',
  page: 1,
})

// Get a single product
const product = await client.products.getProduct('123456')

// Search orders
const { orders } = await client.orders.searchOrders({
  status: 'open',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
})
```

---

## Authentication

The Tiny API authenticates via a `token` query parameter. This client injects it
automatically on every request. **Your token is never logged or exposed in error messages.**

```ts
const client = new TinyClient({
  token: process.env.TINY_TOKEN!, // injected internally, never leaked
  plan: 'Evoluir',
})
```

---

## Rate Limiting

The client automatically queues requests when your plan's limit is reached.
Requests resume as soon as a new token is available — no manual retry logic needed.

| Plan | Requests / min | Batch calls |
|---|---|---|
| `Começar` | 0 — no API access | 0 |
| `Crescer` | 30 | 5 |
| `Evoluir` | 60 | 5 |
| `Potencializar` | 120 | 5 |

```ts
// All requests are automatically throttled — fire and forget
const results = await Promise.all(
  ids.map(id => client.products.getProduct(id))
)
```

The `Começar` plan has no API access. Calling any method will immediately throw
a `TinyRateLimitError`.

---

## Products API

```ts
client.products.searchProducts({ query?: string, page?: number })
// → { products: Product[], page: number, numberOfPages: number }

client.products.getProduct(id: string)
// → Product

client.products.createProduct(input: Omit<Product, 'id'>)
// → Product  (fetches the created record from the API)

client.products.updateProduct(id: string, input: Partial<Omit<Product, 'id'>>)
// → Product  (fetches the updated record from the API)

client.products.getStock(id: string)
// → { productId: string, quantity: number }  (sum across all warehouses)

client.products.getStructure(id: string)
// → unknown  (raw BOM / bill of materials)

client.products.getChangedProducts(since: string)  // ISO date: 'YYYY-MM-DD'
// → Product[]

client.products.getStockUpdates(since: string)     // ISO date: 'YYYY-MM-DD'
// → Array<{ productId: string, quantity: number }>

client.products.updateStock(id: string, quantity: number)
// → void

client.products.updatePrices(id: string, price: number)
// → void
```

### Product shape

```ts
interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  price?: number        // parsed from Tiny's string
  weight?: number       // parsed from Tiny's string (peso_bruto)
  unit?: string
  active: boolean       // true when Tiny situacao === 'A'
}
```

---

## Orders API

```ts
client.orders.searchOrders({
  status?: OrderStatus,
  page?: number,
  startDate?: string,  // ISO: 'YYYY-MM-DD'
  endDate?: string,    // ISO: 'YYYY-MM-DD'
})
// → { orders: Order[], page: number, numberOfPages: number }

client.orders.getOrder(id: string)
// → Order

client.orders.createOrder(input: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'>)
// → Order  (fetches the created record from the API)

client.orders.updateOrder(id: string, input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>)
// → Order  (fetches the updated record from the API)
```

### Order shape

```ts
type OrderStatus = 'open' | 'approved' | 'cancelled' | 'invoiced' | 'shipped' | 'delivered'

interface Order {
  id: string
  number: string
  status: OrderStatus
  createdAt: string      // ISO: 'YYYY-MM-DD'
  updatedAt: string      // ISO: 'YYYY-MM-DD'
  items: OrderItem[]
  total: number
  customerId?: string
  customerName?: string
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}
```

---

## Error Handling

All errors extend `TinyApiError` and carry a `code` string and optional `details`.

```ts
import {
  TinyApiError,
  TinyRateLimitError,
  TinyTransportError,
  TinyMappingError,
} from 'tiny-erp-client'

try {
  await client.products.getProduct('999')
} catch (err) {
  if (err instanceof TinyRateLimitError) {
    // plan has no API access, or queue is blocked
  } else if (err instanceof TinyTransportError) {
    // network failure or unparseable response
  } else if (err instanceof TinyMappingError) {
    // unexpected field format from Tiny API
  } else if (err instanceof TinyApiError) {
    console.error(err.code, err.details)
  }
}
```

| Error class | `code` | When |
|---|---|---|
| `TinyRateLimitError` | `RATE_LIMIT_EXCEEDED` | Plan is `Começar`, or quota exceeded |
| `TinyTransportError` | `TRANSPORT_ERROR` | Network failure, JSON parse error |
| `TinyMappingError` | `MAPPING_ERROR` | Unexpected field format from Tiny API |
| `TinyApiError` | `HTTP_4xx` / `TINY_STATUS_ERROR` | HTTP error or `retorno.status !== 'OK'` |

---

## Custom HTTP Client

You can inject your own HTTP transport for testing or advanced use cases:

```ts
import type { HttpClient, HttpRequest, HttpResponse } from 'tiny-erp-client'

class MyHttpClient implements HttpClient {
  async request<T>(config: HttpRequest): Promise<HttpResponse<T>> {
    // your implementation
  }
}

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir',
  httpClient: new MyHttpClient(),
})
```

---

## License

[MIT](./LICENSE)
