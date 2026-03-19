# tiny-erp-client

A high-performance, fully typed TypeScript client for the [Tiny ERP](https://tiny.com.br) API.

## Why tiny-erp-client?

| Feature | Details |
|---|---|
| **Strictly typed** | No `any`. Full IntelliSense on every field. |
| **English field names** | All Portuguese API fields are translated automatically. |
| **Plan-aware rate limiting** | Token bucket queue respects your Tiny plan's limits. |
| **Safe by design** | Your API token never appears in logs, errors, or stack traces. |
| **Zero runtime dependencies** | Pure TypeScript, ships as ESM + CJS. |

## Quick Start

```bash
npm install tiny-erp-client
```

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

// Search orders
const { orders } = await client.orders.searchOrders({
  status: 'open',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
})
```

## Requirements

- **Node.js ≥ 18** (native `fetch` required)
- A Tiny ERP account with API access (`Crescer` plan or higher)

## Resources

- [Installation](installation.md) — setup guide
- [Basic Usage](basic-usage.md) — common patterns
- [API Reference](api-reference.md) — full method documentation
- [Rate Limiting](rate-limiting.md) — plan limits and queuing
- [Error Handling](error-handling.md) — error types and handling
- [Advanced Usage](advanced-usage.md) — custom HTTP client, testing
