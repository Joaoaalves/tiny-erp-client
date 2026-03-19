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
        'src/core/index.ts',
        'src/rate-limit/index.ts',
        // shell — implementation deferred to feature/client-core
        'src/client/TinyClient.ts',
      ],
    },
  },
})
