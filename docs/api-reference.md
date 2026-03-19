# API Reference

## TinyClient

```ts
new TinyClient(config: TinyClientConfig)
```

| Option | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | Yes | Your Tiny ERP API token |
| `plan` | `TinyPlan` | Yes | Your Tiny subscription plan |
| `httpClient` | `HttpClient` | No | Custom HTTP transport (for testing/advanced use) |

```ts
type TinyPlan = 'Começar' | 'Crescer' | 'Evoluir' | 'Potencializar'
```

The client exposes two namespaces:
- `client.products` — [`ProductsEndpoint`](#products-endpoint)
- `client.orders` — [`OrdersEndpoint`](#orders-endpoint)

---

## Products Endpoint

### `searchProducts(input?)`

```ts
client.products.searchProducts(input?: SearchProductsInput): Promise<SearchProductsOutput>

interface SearchProductsInput {
  query?: string   // free-text search
  page?: number    // 1-based, defaults to 1
}

interface SearchProductsOutput {
  products: Product[]
  page: number
  numberOfPages: number
}
```

### `getProduct(id)`

```ts
client.products.getProduct(id: string): Promise<Product>
```

### `createProduct(input)`

```ts
client.products.createProduct(input: Omit<Product, 'id'>): Promise<Product>
```

Makes two API calls: one to create, one to fetch the newly created record.

### `updateProduct(id, input)`

```ts
client.products.updateProduct(id: string, input: Partial<Omit<Product, 'id'>>): Promise<Product>
```

Makes two API calls: one to update, one to fetch the updated record.

### `getStock(id)`

```ts
client.products.getStock(id: string): Promise<{ productId: string; quantity: number }>
```

Returns the sum of stock across all warehouses (deposits).

### `getStructure(id)`

```ts
client.products.getStructure(id: string): Promise<unknown>
```

Returns the raw bill-of-materials (BOM/estrutura) object from Tiny. Structure varies by product; shape is not normalized.

### `getChangedProducts(since)`

```ts
client.products.getChangedProducts(since: string): Promise<Product[]>
// since: ISO date string 'YYYY-MM-DD'
```

Returns all products modified on or after `since`.

### `getStockUpdates(since)`

```ts
client.products.getStockUpdates(since: string): Promise<Array<{ productId: string; quantity: number }>>
// since: ISO date string 'YYYY-MM-DD'
```

### `updateStock(id, quantity)`

```ts
client.products.updateStock(id: string, quantity: number): Promise<void>
```

### `updatePrices(id, price)`

```ts
client.products.updatePrices(id: string, price: number): Promise<void>
```

---

## Product shape

```ts
interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  price?: number    // parsed from Tiny's string (comma decimals → float)
  weight?: number   // parsed from Tiny's peso_bruto
  unit?: string
  active: boolean   // true when Tiny situacao === 'A'
}
```

---

## Orders Endpoint

### `searchOrders(input?)`

```ts
client.orders.searchOrders(input?: SearchOrdersInput): Promise<SearchOrdersOutput>

interface SearchOrdersInput {
  status?: OrderStatus
  page?: number
  startDate?: string  // ISO: 'YYYY-MM-DD'
  endDate?: string    // ISO: 'YYYY-MM-DD'
}

interface SearchOrdersOutput {
  orders: Order[]
  page: number
  numberOfPages: number
}
```

### `getOrder(id)`

```ts
client.orders.getOrder(id: string): Promise<Order>
```

### `createOrder(input)`

```ts
client.orders.createOrder(
  input: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'>
): Promise<Order>
```

Makes two API calls: one to create, one to fetch the newly created record.

### `updateOrder(id, input)`

```ts
client.orders.updateOrder(
  id: string,
  input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>
): Promise<Order>
```

Makes two API calls: one to update, one to fetch the updated record.

---

## Order shape

```ts
type OrderStatus =
  | 'open'
  | 'approved'
  | 'cancelled'
  | 'invoiced'
  | 'shipped'
  | 'delivered'

interface Order {
  id: string
  number: string
  status: OrderStatus
  createdAt: string     // ISO: 'YYYY-MM-DD'
  updatedAt: string     // ISO: 'YYYY-MM-DD'
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

## Error classes

See [Error Handling](error-handling.md) for full documentation.

```ts
import {
  TinyApiError,
  TinyRateLimitError,
  TinyTransportError,
  TinyMappingError,
} from 'tiny-erp-client'
```
