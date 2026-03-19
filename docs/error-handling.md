# Error Handling

## Error hierarchy

All errors thrown by the client extend `TinyApiError`:

```
Error
└── TinyApiError          (base — all client errors)
    ├── TinyRateLimitError  (plan has no access, or quota exceeded)
    ├── TinyTransportError  (network failure, unparseable response)
    └── TinyMappingError    (unexpected field format from Tiny API)
```

## Error reference

| Class | `code` | When it's thrown |
|---|---|---|
| `TinyRateLimitError` | `RATE_LIMIT_EXCEEDED` | Plan is `Começar`, or the rate queue is stalled |
| `TinyTransportError` | `TRANSPORT_ERROR` | Network failure, DNS error, JSON parse error |
| `TinyMappingError` | `MAPPING_ERROR` | Tiny returned a field in an unexpected format |
| `TinyApiError` | `HTTP_4xx` / `HTTP_5xx` / `TINY_STATUS_ERROR` | HTTP error or `retorno.status !== 'OK'` |

## Importing error classes

```ts
import {
  TinyApiError,
  TinyRateLimitError,
  TinyTransportError,
  TinyMappingError,
} from 'tiny-erp-client'
```

## Handling errors

```ts
try {
  const product = await client.products.getProduct('123456')
} catch (err) {
  if (err instanceof TinyRateLimitError) {
    // Plan is 'Começar' — no API access, or the queue stalled
    console.error('Rate limit:', err.message)

  } else if (err instanceof TinyTransportError) {
    // Network failure or unparseable JSON from Tiny
    console.error('Transport error:', err.message)

  } else if (err instanceof TinyMappingError) {
    // Tiny returned a field in an unexpected format
    // (e.g., a non-numeric string where a price was expected)
    console.error('Mapping error:', err.message, err.details)

  } else if (err instanceof TinyApiError) {
    // HTTP error or Tiny returned retorno.status !== 'OK'
    console.error('API error:', err.code, err.details)

  } else {
    throw err // unexpected — rethrow
  }
}
```

## TinyApiError properties

```ts
class TinyApiError extends Error {
  code: string        // machine-readable error code
  details?: unknown   // raw response body or additional context
}
```

## Token safety

Your API token is **never** included in error messages, even `TinyTransportError` which contains the request URL. All URLs are sanitized before being attached to errors:

```
// What you might expect in an error:
GET https://api.tiny.com.br/api2/produto.obter?token=abc123&id=123456

// What you actually see:
GET https://api.tiny.com.br/api2/produto.obter?token=***&id=123456
```

## Common scenarios

### Product not found

Tiny returns `retorno.status !== 'OK'` with a message. This becomes a `TinyApiError`:

```ts
try {
  await client.products.getProduct('nonexistent')
} catch (err) {
  if (err instanceof TinyApiError) {
    console.log(err.code)    // 'TINY_STATUS_ERROR'
    console.log(err.details) // Tiny's raw retorno object
  }
}
```

### Network failure

```ts
try {
  await client.products.searchProducts()
} catch (err) {
  if (err instanceof TinyTransportError) {
    // Retry logic, circuit breaker, etc.
  }
}
```

### Unexpected Tiny API format

If Tiny changes their API and sends a field in an unexpected format (e.g., price as an object instead of a string), a `TinyMappingError` is thrown. The `details` property contains the raw value that failed to parse:

```ts
try {
  await client.products.getProduct('123456')
} catch (err) {
  if (err instanceof TinyMappingError) {
    console.log(err.message) // 'Expected numeric string for field "price"'
    console.log(err.details) // the raw value that failed
  }
}
```
