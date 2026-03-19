# Rate Limiting

## Plan limits

The Tiny ERP API enforces per-minute rate limits based on your subscription plan.

| Plan | Requests / min | Batch calls | Notes |
|---|---|---|---|
| `Começar` | — | — | No API access |
| `Crescer` | 30 | 5 | |
| `Evoluir` | 60 | 5 | |
| `Potencializar` | 120 | 5 | |

Always set `plan` to match your actual Tiny subscription:

```ts
const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir', // must match your account plan
})
```

## How it works

The client uses a **token bucket** algorithm:

1. The bucket starts full (e.g., 60 tokens for the `Evoluir` plan).
2. Each request consumes one token.
3. Tokens refill proportionally over time, up to the bucket capacity.
4. When the bucket is empty, requests are queued and released as tokens become available.

This means you can fire many requests at once and the client handles throttling automatically — no manual `sleep()` or retry logic needed.

```ts
const ids = ['111', '222', '333', /* ... 50 more */ ]

// All 50+ requests are queued and released at 60/min
const products = await Promise.all(
  ids.map(id => client.products.getProduct(id))
)
```

## The `Começar` plan

The `Começar` plan has zero API access. Any call will immediately throw a `TinyRateLimitError`:

```ts
const client = new TinyClient({ token: '...', plan: 'Começar' })

try {
  await client.products.searchProducts()
} catch (err) {
  if (err instanceof TinyRateLimitError) {
    // err.message: 'Plan "Começar" does not have API access'
    console.error('Upgrade your Tiny plan to use the API.')
  }
}
```

## Queue behavior

- Requests are resolved in FIFO order.
- The queue has no maximum size — all pending requests will eventually resolve.
- If you need a timeout, wrap the call in `Promise.race` with a timeout promise.

```ts
import { TinyRateLimitError } from 'tiny-erp-client'

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ])

const product = await withTimeout(client.products.getProduct('123'), 5000)
```
