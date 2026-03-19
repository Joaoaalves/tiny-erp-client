# Installation

## Requirements

- **Node.js ≥ 18** — the client relies on the native `fetch` API introduced in Node 18.
- A Tiny ERP account on the `Crescer`, `Evoluir`, or `Potencializar` plan (the `Começar` plan has no API access).

## Package managers

```bash
# npm
npm install tiny-erp-client

# yarn
yarn add tiny-erp-client

# pnpm
pnpm add tiny-erp-client
```

## TypeScript

The package ships with full `.d.ts` declarations — no `@types/` package needed.

Minimum recommended `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

## Module formats

The package ships both **ESM** and **CommonJS** bundles. Your bundler or Node.js will pick the right one automatically via the `exports` map.

```json
{
  "exports": {
    ".": {
      "types":   "./dist/index.d.ts",
      "import":  "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

## Obtaining your Tiny API token

1. Log in to [app.tiny.com.br](https://app.tiny.com.br).
2. Go to **Configurações → API**.
3. Generate or copy your token.
4. Store it in an environment variable — **never hardcode it**.

```bash
# .env
TINY_TOKEN=your_token_here
```

```ts
import { TinyClient } from 'tiny-erp-client'

const client = new TinyClient({
  token: process.env.TINY_TOKEN!,
  plan: 'Evoluir',
})
```

> **Security note:** The client injects the token internally and redacts it from all error messages and logs. You will never see your raw token in a stack trace.
