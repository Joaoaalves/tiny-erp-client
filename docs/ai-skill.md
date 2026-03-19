# AI Skill

The `tiny-erp-client` AI skill lets an AI assistant (Claude, Cursor, Copilot, etc.) answer questions about this library without loading the entire documentation into context. Instead, the AI runs a small Python search script that queries a structured CSV index and returns only the relevant entries.

---

## How it works

```
ai-skill/
  tiny-erp-client.csv   ← structured documentation index (70+ entries)
  search.py             ← relevance-scored search CLI
  SKILL.md              ← instructions for the AI assistant
```

The AI reads `SKILL.md` once (it's tiny) and calls `search.py` on demand. This avoids polluting the context window with pages of documentation the AI doesn't need.

---

## Setup

The `ai-skill/` directory ships inside this repository. No extra installation is required — just make sure Python 3 is available.

```bash
# Verify Python is available
python --version   # or python3 --version
```

No third-party Python packages are needed. The script uses only the standard library.

---

## Usage

### Search the docs

```bash
python ai-skill/search.py "<query>"
```

Examples:

```bash
# How to create an order
python ai-skill/search.py "create order"

# Full signature for a method
python ai-skill/search.py "updateStock"

# What fields are on an Order
python ai-skill/search.py "Order fields"

# How the customer object works
python ai-skill/search.py "OrderCustomer"

# Error handling
python ai-skill/search.py "error handling" --topic errors

# Freight / shipping fields
python ai-skill/search.py "freight"

# Stock with deposits
python ai-skill/search.py "getStock deposits"

# Rate limiting behavior
python ai-skill/search.py "rate limit queue"

# Type mapping from Portuguese
python ai-skill/search.py "portuguese english translation"
```

### List all topics

```bash
python ai-skill/search.py --list-topics
```

### Options

| Flag | Description |
|---|---|
| `--limit N` | Max results to return (default: 10) |
| `--topic TOPIC` | Filter by topic: `products`, `orders`, `type`, `errors`, `rate_limit`, `advanced`, `translation`, `client`, `installation` |

---

## Topics

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

---

## Pointing your AI assistant to the skill

If you use Claude Code, add a reference to `SKILL.md` in your `CLAUDE.md` or simply tell the assistant:

```
Use the AI skill at ai-skill/SKILL.md to look up tiny-erp-client documentation.
Run: python ai-skill/search.py "<query>"
```

The AI will call `search.py` whenever it needs to know a method signature, type definition, or behavior — instead of asking you or hallucinating an answer.

---

## Example session

```
You:     How do I update stock with an absolute balance?

Claude:  [runs: python ai-skill/search.py "updateStock balance"]

         Found 3 result(s) for: 'updateStock balance'

         [1] products / updateStock
           Update stock level with movement type
           Signature: updateStock(input: UpdateStockInput): Promise<UpdateStockResult>
           Example:   await client.products.updateStock({ productId: '123', quantity: 100, movementType: 'balance' })
           Notes:     movementType: 'entry'=add | 'exit'=remove | 'balance'=set absolute

         Use movementType: 'balance' to set an absolute quantity:

         const result = await client.products.updateStock({
           productId: '123456',
           quantity: 100,
           movementType: 'balance',
         })
         console.log(result.balanceAfter) // 100
```
