# tiny-erp-client AI Skill

This skill allows an AI assistant to look up `tiny-erp-client` library documentation
without loading the full docs into context.

## How to use

Run the search script to answer questions about the library:

```bash
python ai-skill/search.py "<query>"
```

### Search examples

```bash
# How to create an order
python ai-skill/search.py "create order"

# Full signature for a method
python ai-skill/search.py "updateStock"

# What fields are on an Order
python ai-skill/search.py "Order fields"

# How customer works
python ai-skill/search.py "OrderCustomer"

# Error handling
python ai-skill/search.py "error handling" --topic errors

# Freight / shipping
python ai-skill/search.py "freight"

# Stock with deposits
python ai-skill/search.py "getStock deposits"

# Rate limiting behavior
python ai-skill/search.py "rate limit queue"

# Type mapping from Portuguese
python ai-skill/search.py "portuguese english translation"

# List all available topics
python ai-skill/search.py --list-topics
```

### Options

| Flag | Description |
|---|---|
| `--limit N` | Max results to return (default: 10) |
| `--topic TOPIC` | Filter by topic: `products`, `orders`, `type`, `errors`, `rate_limit`, `advanced`, `translation`, `client`, `installation` |

## Topics overview

| Topic | What it covers |
|---|---|
| `installation` | npm install, Node.js requirements |
| `client` | TinyClient constructor, plans, namespaces |
| `products` | All 10 products endpoint methods |
| `orders` | All 4 orders endpoint methods |
| `type` | All TypeScript interfaces and union types |
| `errors` | Error hierarchy, error codes, token safety |
| `rate_limit` | Plan limits, queue behavior |
| `advanced` | Custom HttpClient, msw, dotenv, zod |
| `translation` | PT→EN field mapping, date/number conversion |

## Key facts to know before searching

- **Authentication**: token is injected internally via `?token=` query param — never pass it manually
- **customer**: `Order.customer` is a **nested `OrderCustomer` object** — not flat `customerName`/`customerId` fields
- **status**: `Product.status` is `'active' | 'inactive'` — not a boolean `active` field
- **getStock**: returns `ProductStock` with full deposit breakdown — not just `{ productId, quantity }`
- **getStructure**: returns typed `ProductStructure` with `components[]` — not `unknown`
- **updateStock**: takes `UpdateStockInput` object — not `(id, quantity)` positional args
- **getStockUpdates**: returns `StockUpdate[]` with deposits — requires Tiny real-time stock extension
- **Dates**: all dates are ISO `YYYY-MM-DD` (Tiny's `DD/MM/YYYY` is converted automatically)
- **Two-call methods**: `createProduct`, `updateProduct`, `createOrder`, `updateOrder` each make 2 API calls
- **Node.js ≥ 18** required (native fetch)
