# Basic Usage

## Creating a client

```ts
import { TinyClient } from 'tiny-erp-client'

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir', // 'Começar' | 'Crescer' | 'Evoluir' | 'Potencializar'
})
```

The `plan` value controls the rate limiter. Always pass the plan that matches your Tiny subscription.

---

## Products

### Search products

```ts
const { products, page, numberOfPages } = await client.products.searchProducts({
  query: 'camiseta', // optional
  page: 1,           // optional, defaults to 1
})

for (const product of products) {
  console.log(product.id, product.name, product.price)
}
```

### Get a product

```ts
const product = await client.products.getProduct('123456')
console.log(product.sku, product.active)
```

### Create a product

```ts
const created = await client.products.createProduct({
  name: 'Camiseta Preta M',
  sku: 'CAM-PT-M',
  price: 59.90,
  unit: 'UN',
  active: true,
})
console.log(created.id) // Tiny-assigned ID
```

### Update a product

```ts
const updated = await client.products.updateProduct('123456', {
  price: 69.90,
  active: false,
})
```

### Stock

```ts
// Get total stock across all warehouses
const { productId, quantity } = await client.products.getStock('123456')

// Update stock
await client.products.updateStock('123456', 100)

// Bulk price update
await client.products.updatePrices('123456', 79.90)
```

### Changed products and stock updates

```ts
// All products changed since a given date
const changed = await client.products.getChangedProducts('2024-01-01')

// All stock changes since a given date
const stockUpdates = await client.products.getStockUpdates('2024-01-01')
```

---

## Orders

### Search orders

```ts
const { orders, page, numberOfPages } = await client.orders.searchOrders({
  status: 'open',             // optional
  page: 1,                    // optional
  startDate: '2024-01-01',    // optional, ISO format
  endDate: '2024-12-31',      // optional, ISO format
})
```

Available statuses: `'open'`, `'approved'`, `'cancelled'`, `'invoiced'`, `'shipped'`, `'delivered'`

### Get an order

```ts
const order = await client.orders.getOrder('789012')
console.log(order.number, order.total, order.status)

for (const item of order.items) {
  console.log(item.productName, item.quantity, item.unitPrice)
}
```

### Create an order

```ts
const order = await client.orders.createOrder({
  status: 'open',
  items: [
    {
      productId: '123456',
      productName: 'Camiseta Preta M',
      quantity: 2,
      unitPrice: 59.90,
      totalPrice: 119.80,
    },
  ],
  total: 119.80,
  customerId: 'CUST-001',
  customerName: 'João Silva',
})
```

### Update an order

```ts
const updated = await client.orders.updateOrder('789012', {
  status: 'approved',
})
```

---

## Parallel requests

All requests are automatically throttled by the rate limiter. You can fire many requests in parallel — the client will queue them and release them at your plan's allowed rate.

```ts
const ids = ['111', '222', '333', '444', '555']

// Safe to run in parallel — rate limiter handles the throttling
const products = await Promise.all(
  ids.map(id => client.products.getProduct(id))
)
```
