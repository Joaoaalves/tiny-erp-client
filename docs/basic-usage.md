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
console.log(product.sku, product.status) // 'active' | 'inactive'
```

### Create a product

```ts
const created = await client.products.createProduct({
  name: 'Camiseta Preta M',
  sku: 'CAM-PT-M',
  status: 'active',
  price: 59.90,
  unit: 'UN',
  grossWeight: 0.3,
  brand: 'Nike',
  ncm: '6109.10.00',
})
console.log(created.id) // Tiny-assigned ID
```

### Update a product

```ts
const updated = await client.products.updateProduct('123456', {
  price: 69.90,
  status: 'inactive',
})
```

### Get stock

```ts
const stock = await client.products.getStock('123456')

console.log(stock.quantity)         // total balance
console.log(stock.reservedQuantity) // committed stock
console.log(stock.name, stock.sku)

for (const deposit of stock.deposits) {
  console.log(deposit.name, deposit.quantity, deposit.ignore)
}
```

### Update stock

```ts
// Set absolute stock level (balance)
const result = await client.products.updateStock({
  productId: '123456',
  quantity: 100,
})
console.log(result.balanceAfter)  // new total stock
console.log(result.isNewRecord)   // whether a new movement was created

// Record an entry (add to stock)
await client.products.updateStock({
  productId: '123456',
  quantity: 20,
  movementType: 'entry',
  notes: 'Reposição de estoque',
})

// Record an exit (remove from stock)
await client.products.updateStock({
  productId: '123456',
  quantity: 5,
  movementType: 'exit',
  warehouse: 'Depósito Principal',
})
```

### Get product structure (BOM)

```ts
const structure = await client.products.getStructure('123456')

console.log(structure.name)  // kit or manufactured product name
for (const component of structure.components) {
  console.log(component.name, component.quantity, component.sku)
}
```

### Update price

```ts
await client.products.updatePrices('123456', 79.90)
```

### Changed products and stock updates

```ts
// All products changed since a given date
const changed = await client.products.getChangedProducts('2024-01-01')

// All stock changes since a given date
const stockUpdates = await client.products.getStockUpdates('2024-01-01')
for (const update of stockUpdates) {
  console.log(update.productId, update.quantity, update.updatedAt)
  console.log(update.variationType) // 'normal' | 'parent' | 'variation'
}
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
console.log(order.customer.name, order.customer.email)
console.log(order.trackingCode, order.trackingUrl)

for (const item of order.items) {
  console.log(item.productName, item.quantity, item.unitPrice)
}
```

### Create an order

```ts
const order = await client.orders.createOrder({
  status: 'open',
  customer: {
    name: 'João Silva',
    taxId: '123.456.789-00',
    personType: 'individual',
    email: 'joao@example.com',
    phone: '11999999999',
    address: 'Rua das Flores',
    addressNumber: '100',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
  },
  items: [
    {
      productId: '123456',
      productName: 'Camiseta Preta M',
      unit: 'UN',
      quantity: 2,
      unitPrice: 59.90,
      totalPrice: 119.80,
    },
  ],
  total: 119.80,
  paymentMethod: 'boleto',
  freightAmount: 15.00,
  freightResponsibility: 'sender',
  notes: 'Entregar no período da manhã',
})

console.log(order.id, order.number)
```

### Update an order

```ts
// Update status
const updated = await client.orders.updateOrder('789012', {
  status: 'shipped',
  trackingCode: 'BR123456789BR',
  trackingUrl: 'https://correios.com.br/track',
})

// Update customer info
await client.orders.updateOrder('789012', {
  customer: {
    name: 'Maria Oliveira',
    email: 'maria@example.com',
  },
  internalNotes: 'Cliente VIP',
})
```

### Delivery address

When the delivery address differs from the customer address:

```ts
const order = await client.orders.createOrder({
  status: 'open',
  customer: { name: 'João Silva' },
  deliveryAddress: {
    recipientName: 'Empresa XYZ',
    address: 'Av. Paulista',
    addressNumber: '1000',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-000',
  },
  items: [],
  total: 0,
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
