import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      include: ['src/**/*.ts'],
      exclude: [
        // barrel/re-export files — no logic to cover
        'src/index.ts',
        'src/client/index.ts',
        'src/core/index.ts',
        'src/rate-limit/index.ts',
        // endpoint index barrels — implementations deferred to feature/products and feature/orders
        'src/endpoints/products/index.ts',
        'src/endpoints/orders/index.ts',
      ],
    },
  },
})
