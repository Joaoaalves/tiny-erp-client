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

### `searchProducts(input)`

```ts
client.products.searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput>

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
client.products.getStock(id: string): Promise<ProductStock>

interface ProductStock {
  productId: string
  name: string
  sku?: string
  unit?: string
  quantity: number          // total stock balance
  reservedQuantity: number  // reserved (committed) stock
  deposits: ProductStockDeposit[]
}

interface ProductStockDeposit {
  name: string
  ignore: boolean   // true when Tiny's desconsiderar = 'S'
  quantity: number
  company?: string
}
```

### `getStructure(id)`

```ts
client.products.getStructure(id: string): Promise<ProductStructure>

interface ProductStructure {
  productId: string
  name: string
  sku?: string
  components: ProductStructureComponent[]
}

interface ProductStructureComponent {
  componentId: string
  sku?: string
  name: string
  quantity: number
}
```

Returns the bill-of-materials (BOM) composition of a kit or manufactured product.

### `getChangedProducts(since)`

```ts
client.products.getChangedProducts(since: string): Promise<Product[]>
// since: ISO date string 'YYYY-MM-DD'
```

Returns all products modified on or after `since`.

### `getStockUpdates(since)`

```ts
client.products.getStockUpdates(since: string): Promise<StockUpdate[]>
// since: ISO date string 'YYYY-MM-DD'

interface StockUpdate {
  productId: string
  name: string
  sku?: string
  unit?: string
  variationType?: StockVariationType  // 'normal' | 'parent' | 'variation'
  location?: string
  updatedAt: string                   // raw datetime from Tiny API
  quantity: number
  reservedQuantity: number
  deposits: StockUpdateDeposit[]
}

interface StockUpdateDeposit {
  name: string
  ignore: boolean
  quantity: number
}

type StockVariationType = 'normal' | 'parent' | 'variation'
```

> Requires the **"API para estoque em tempo real"** extension on your Tiny account. Records are removed from the queue after retrieval.

### `updateStock(input)`

```ts
client.products.updateStock(input: UpdateStockInput): Promise<UpdateStockResult>

interface UpdateStockInput {
  productId: string
  quantity: number
  movementType?: StockMovementType  // default: omitted (Tiny uses 'B' as default)
  date?: string                     // datetime string, e.g. '2024-03-15 10:00:00'
  unitPrice?: number
  notes?: string
  warehouse?: string                // warehouse name; uses Tiny default if omitted
}

type StockMovementType = 'entry' | 'exit' | 'balance'
// entry   → 'E' — adds to stock
// exit    → 'S' — removes from stock
// balance → 'B' — sets absolute stock level

interface UpdateStockResult {
  sequenceId: string
  status: string
  movementId: number
  balanceAfter: number
  reservedBalance: number
  isNewRecord: boolean
}
```

### `updatePrices(id, price)`

```ts
client.products.updatePrices(id: string, price: number): Promise<void>
```

---

## Product shape

```ts
interface Product {
  // Identity
  id: string
  name: string
  sku?: string
  createdAt?: string          // ISO: 'YYYY-MM-DD'

  // Status
  status: ProductStatus       // 'active' | 'inactive'
  type?: ProductType          // 'product' | 'service'

  // Pricing
  price?: number
  salePrice?: number
  costPrice?: number
  averageCostPrice?: number

  // Fiscal
  ncm?: string
  origin?: string             // ICMS origin code (0–8)
  gtin?: string
  gtinPackaging?: string
  ipiClass?: string
  fixedIpiValue?: number
  serviceListCode?: string
  cest?: string

  // Physical
  unit?: string
  unitsPerBox?: string
  netWeight?: number
  grossWeight?: number

  // Packaging (cm)
  packagingType?: PackagingType   // 'envelope' | 'box' | 'cylinder'
  packagingHeight?: number
  packagingWidth?: number
  packagingLength?: number
  packagingDiameter?: number

  // Stock thresholds
  minStock?: number
  maxStock?: number

  // Supplier
  supplierId?: string
  supplierCode?: string
  supplierProductCode?: string

  // Classification
  class?: ProductClass        // 'simple' | 'kit' | 'with-variations' | 'manufactured' | 'raw-material'
  brand?: string
  category?: string
  location?: string

  // Variations
  variationType?: ProductVariationType  // 'normal' | 'parent' | 'variation'
  parentProductId?: string
  attributes?: Record<string, string>
  variations?: ProductVariation[]

  // Kit
  kitItems?: ProductKitItem[]

  // Fulfillment
  madeToOrder?: boolean
  preparationDays?: number

  // Content
  description?: string
  notes?: string
  warranty?: string
  attachments?: string[]
  externalImages?: string[]

  // SEO / e-commerce
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  videoLink?: string
  slug?: string

  // E-commerce mappings
  mappings?: ProductMapping[]
}
```

---

## Orders Endpoint

### `searchOrders(input)`

```ts
client.orders.searchOrders(input: SearchOrdersInput): Promise<SearchOrdersOutput>

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
type OrderStatus = 'open' | 'approved' | 'cancelled' | 'invoiced' | 'shipped' | 'delivered'
type PersonType = 'individual' | 'company' | 'foreign'
type FreightResponsibility = 'sender' | 'recipient' | 'third-party' | 'no-freight'

interface Order {
  // Identity
  id: string
  number: string              // Tiny internal order number
  ecommerceNumber?: string    // E-commerce platform order number

  // Status
  status: OrderStatus

  // Dates (ISO: 'YYYY-MM-DD')
  createdAt: string
  estimatedAt?: string
  invoicedAt?: string
  shippedAt?: string
  deliveredAt?: string
  updatedAt?: string

  // Parties
  customer: OrderCustomer
  deliveryAddress?: OrderDeliveryAddress

  // Items
  items: OrderItem[]

  // Payment
  paymentTerms?: string
  paymentMethod?: string
  paymentMethodDescription?: string
  installments?: OrderInstallment[]
  integratedPayments?: OrderIntegratedPayment[]

  // Shipping
  carrierName?: string
  freightResponsibility?: FreightResponsibility
  freightMethod?: string
  shippingMethod?: string

  // Financials
  freightAmount?: number
  discount?: number
  additionalExpenses?: number
  itemsTotal?: number
  total: number

  // References
  purchaseOrderNumber?: string
  sellerId?: string
  sellerName?: string
  invoiceId?: string
  warehouse?: string
  operationNatureId?: string

  // Tracking
  trackingCode?: string
  trackingUrl?: string

  // Notes
  notes?: string
  internalNotes?: string

  // E-commerce
  ecommerce?: OrderEcommerce
  intermediary?: OrderIntermediary
  markers?: OrderMarker[]
}

interface OrderCustomer {
  code?: string
  name: string
  tradeName?: string
  personType?: PersonType
  taxId?: string              // CPF or CNPJ
  stateRegistration?: string
  rg?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  zipCode?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
}

interface OrderDeliveryAddress {
  personType?: PersonType
  taxId?: string
  recipientName?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  zipCode?: string
  city?: string
  state?: string
  phone?: string
  stateRegistration?: string
}

interface OrderItem {
  productId?: string
  sku?: string
  productName: string
  unit?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  additionalInfo?: string
}

interface OrderInstallment {
  days?: number
  dueDate?: string      // ISO: 'YYYY-MM-DD'
  amount: number
  notes?: string
  paymentMethod: string
  paymentMethodDescription?: string
}

interface OrderMarker {
  id: number
  description: string
  color?: string        // hex, e.g. '#FF0000'
}

interface OrderEcommerce {
  id?: number
  orderNumber?: string
  salesChannelOrderNumber?: string
  storeName?: string
  salesChannel?: string
}

interface OrderIntermediary {
  name: string
  taxId: string         // CNPJ
  paymentTaxId?: string
}

interface OrderIntegratedPayment {
  amount: number
  paymentType: number   // NFe payment type code
  intermediaryTaxId: string
  authorizationCode: string
  cardBrandCode: number
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
