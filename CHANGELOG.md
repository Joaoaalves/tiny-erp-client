# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-03-19

### Added

#### Core infrastructure
- `FetchHttpClient` — native `fetch`-based HTTP transport with full error normalization
- `sanitizeUrl()` — masks `?token=` in all error messages and logs, preventing token leakage
- `TokenBucketRateLimiter` — token bucket queue that enforces per-plan request limits with
  Promise-based queuing for bursts beyond the limit
- `RequestExecutor` — composes rate limiter + token injection + HTTP transport into a single
  reusable execution unit used by all endpoint modules

#### Plan-based rate limiting
| Plan | Requests/min | Batch calls |
|---|---|---|
| Começar | 0 | 0 |
| Crescer | 30 | 5 |
| Evoluir | 60 | 5 |
| Potencializar | 120 | 5 |

#### Error hierarchy
- `TinyApiError` — base error with `code` and `details`
- `TinyRateLimitError` — thrown when plan has 0 requests/min or quota exceeded
- `TinyTransportError` — wraps network failures and JSON parse errors
- `TinyMappingError` — thrown when a field cannot be mapped from/to the Tiny API format

#### Data translation (Portuguese → English)
- `mapProduct()` / `mapProducts()` — translates all Tiny product fields to English,
  parsing numeric strings (with comma support), normalising empty strings to `undefined`,
  converting `situacao` to `active: boolean`
- `mapOrder()` / `mapOrders()` — translates all Tiny order fields to English, converts
  `DD/MM/YYYY` dates to ISO `YYYY-MM-DD`, maps all 10 Tiny order statuses to 6 normalized
  `OrderStatus` values, sums items, handles absent `data_alteracao`
- `parseTinyDate()` — converts Tiny's date format to ISO with clear error on malformed input

#### Products module — 10 methods
- `searchProducts(input)` — search by query and page
- `getProduct(id)` — fetch a single product by ID
- `createProduct(input)` — create a product, returns the freshly fetched record
- `updateProduct(id, input)` — partial update, returns the freshly fetched record
- `getStock(id)` — total stock quantity summed across all warehouses
- `getStructure(id)` — raw BOM (bill of materials) structure
- `getChangedProducts(since)` — products changed since an ISO date
- `getStockUpdates(since)` — stock movements since an ISO date
- `updateStock(id, quantity)` — set stock level
- `updatePrices(id, price)` — update product price

#### Orders module — 4 methods
- `searchOrders(input)` — filter by status, date range, and page
- `getOrder(id)` — fetch a single order by ID
- `createOrder(input)` — create an order, returns the freshly fetched record
- `updateOrder(id, input)` — partial update, returns the freshly fetched record

### Security
- Token is injected internally and never exposed in error messages, logs, or user-facing output
- `sanitizeUrl()` applied to all error paths in `FetchHttpClient`

### Testing
- 255 tests across 12 test files
- 100% statement, branch, function, and line coverage on all non-barrel source files

---

[0.1.0]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.1.0
