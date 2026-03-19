# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.3] - 2026-03-19

### Fixed
- All mutation (POST) requests now send their payload as a JSON-encoded query parameter instead of an HTTP body — Tiny API requires this for all write endpoints
  - `createProduct`: `produto={"produto":{...}}`
  - `updateProduct`: `produto={"produtos":[{"produto":{"sequencia":1,...}}]}`
  - `updateStock`: `estoque={"estoque":{...}}`
  - `updatePrices`: `produto={"produto":{"id":"...","preco":"..."}}`
  - `createOrder`: `pedido={"pedido":{...}}`
  - `updateOrder`: `pedido={"pedido":{"id":"...",...}}`
- Fixed corrupted source line in `ProductsEndpoint.updateStock` (`{Mo` → `{`)

---

## [0.2.2] - 2026-03-19

### Fixed
- `variacoes`, `kit`, `anexos`, `imagens_externas`, `mapeamentos`: Tiny API returns a plain object `{ variacao: {...} }` instead of an array when there is only one item — all list fields now normalise both shapes via `toArray()`
- Empty arrays (`anexos: []`, `imagens_externas: []`) now map to `undefined` for consistency with absent fields
- `id_fornecedor: 0` now maps to `supplierId: undefined` (zero means no supplier in Tiny)
- `idProdutoPai: "0"` now maps to `parentProductId: undefined` (zero means no parent)
- `preco`, `peso_liquido`, `peso_bruto`, `estoque_minimo/maximo`, `preco_custo/medio`, `valor_ipi_fixo`: accepted as `number` in addition to `string` — Tiny returns bare numbers in some responses
- `cod_lista_servicos: null` accepted (Tiny returns `null` for absent service list code)

---

## [0.2.1] - 2026-03-19

### Fixed
- Add `formato=json` query parameter to every request — Tiny API defaults to XML when this param is absent, causing all responses to fail JSON parsing

---

## [0.2.0] - 2026-03-19

### Added

#### Order type enrichment
- `OrderCustomer` — nested customer object replacing flat `customerName`/`customerId` fields; maps all address, contact, and tax fields from the Tiny `cliente` block
- `OrderDeliveryAddress` — separate delivery address when different from customer
- `OrderItem` — typed line items with `productId`, `sku`, `productName`, `quantity`, `unitPrice`, `totalPrice`
- `OrderInstallment` — payment installment with `dueDate`, `amount`, `paymentMethod`
- `OrderMarker` — tag/label with `id`, `description`, and optional `color`
- `OrderEcommerce` — e-commerce metadata (`storeName`, `salesChannel`, `orderNumber`, etc.)
- `OrderIntermediary` — payment intermediary (e.g. PagSeguro) with `name`, `taxId`, `paymentTaxId`
- `OrderIntegratedPayment` — integrated payment entry with NFe-table codes
- `PersonType` union: `'individual' | 'company' | 'foreign'`
- `FreightResponsibility` union: `'sender' | 'recipient' | 'third-party' | 'no-freight'`
- `Order` expanded with: `ecommerceNumber`, `estimatedAt`, `invoicedAt`, `shippedAt`, `deliveredAt`, `updatedAt`, `paymentTerms`, `paymentMethod`, `paymentMethodDescription`, `installments`, `integratedPayments`, `carrierName`, `freightResponsibility`, `freightMethod`, `shippingMethod`, `freightAmount`, `discount`, `additionalExpenses`, `itemsTotal`, `purchaseOrderNumber`, `sellerId`, `sellerName`, `invoiceId`, `warehouse`, `operationNatureId`, `trackingCode`, `trackingUrl`, `notes`, `internalNotes`, `ecommerce`, `intermediary`, `markers`

#### Product stock & structure enrichment
- `ProductStock` — full stock shape with `quantity`, `reservedQuantity`, and `deposits: ProductStockDeposit[]`
- `ProductStockDeposit` — per-warehouse entry with `name`, `ignore`, `quantity`, `company`
- `StockMovementType` union: `'entry' | 'exit' | 'balance'`
- `UpdateStockInput` — structured input replacing positional `(id, quantity)` args; includes `movementType`, `date`, `unitPrice`, `notes`, `warehouse`
- `UpdateStockResult` — typed result with `sequenceId`, `movementId`, `balanceAfter`, `reservedBalance`, `isNewRecord`
- `StockUpdate` — per-product entry from `getStockUpdates` with deposits and `variationType`
- `StockUpdateDeposit` — per-warehouse entry in a `StockUpdate`
- `StockVariationType` union: `'normal' | 'parent' | 'variation'`
- `ProductStructure` — BOM structure with typed `components: ProductStructureComponent[]`
- `ProductStructureComponent` — `componentId`, `sku`, `name`, `quantity`

#### Method signature changes (breaking)
- `getStock(id)` now returns `Promise<ProductStock>` (was `Promise<{ quantity: number }>`)
- `getStructure(id)` now returns `Promise<ProductStructure>` (was `Promise<unknown>`)
- `getStockUpdates(since)` now returns `Promise<StockUpdate[]>` with deposits (was partial)
- `updateStock(input: UpdateStockInput)` replaces `updateStock(id, quantity)` positional args; returns `Promise<UpdateStockResult>`

#### AI skill
- `ai-skill/tiny-erp-client.csv` — 70+ structured documentation entries indexed by topic, subtopic, description, signature, example, and notes
- `ai-skill/search.py` — relevance-scored CLI search over the CSV; supports `--topic` filter and `--limit`
- `ai-skill/SKILL.md` — concise instructions for AI assistants to use the skill

#### Documentation
- `docs/ai-skill.md` — tutorial for setting up and using the AI skill
- `docs/api-reference.md` — fully updated with all new types and method signatures
- `docs/basic-usage.md` — updated examples for `getStock`, `updateStock`, `getStructure`, `createOrder`
- `docs/advanced-usage.md` — fixed `product.active` → `product.status`

### Fixed
- `updateStock` request body: was incorrectly sending `{ produto: { id, quantidade } }` — now sends `{ estoque: { idProduto, quantidade, tipo, ... } }` matching the real Tiny API
- `getStock` response mapping: was reading nonexistent `saldo[].saldo.{id_deposito,nome_deposito}` fields — now correctly reads `produto.saldo` (total) and `produto.depositos[].deposito`
- `getStockUpdates` response mapping: was iterating `atualizacoes[].atualizacao` — now correctly reads `produtos[].produto`
- `order.total`: cross-endpoint compatibility for `total_pedido` (obter) vs `valor` (pesquisar)
- `order.customer`: dual-shape handling for nested `cliente` (obter) and flat `nome`/`id_contato` (pesquisar)

### Testing
- 410 tests, 100% statement/branch/function coverage

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

[0.2.3]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.2.3
[0.2.2]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.2.2
[0.2.1]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.2.1
[0.2.0]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-org/tiny-erp-client/releases/tag/v0.1.0
