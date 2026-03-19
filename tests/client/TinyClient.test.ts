import { describe, it, expect, vi } from 'vitest'
import { TinyClient } from '../../src/client/TinyClient'
import { RequestExecutor } from '../../src/client/RequestExecutor'
import { FetchHttpClient } from '../../src/core/FetchHttpClient'
import type { HttpClient } from '../../src/types/http'
import type { TinyPlan } from '../../src/types/client'

const TOKEN = 'test-token'

function makeHttpClient(): HttpClient {
  return { request: vi.fn().mockResolvedValue({ status: 200, data: {} }) }
}

describe('TinyClient', () => {
  // ── Construction ──────────────────────────────────────────────────────────

  describe('construction', () => {
    const plans: TinyPlan[] = ['Começar', 'Crescer', 'Evoluir', 'Potencializar']

    it.each(plans)('constructs successfully for plan "%s"', plan => {
      expect(() => new TinyClient({ token: TOKEN, plan })).not.toThrow()
    })

    it('exposes a RequestExecutor instance', () => {
      const client = new TinyClient({ token: TOKEN, plan: 'Evoluir' })
      expect(client.executor).toBeInstanceOf(RequestExecutor)
    })

    it('exposes a products property', () => {
      const client = new TinyClient({ token: TOKEN, plan: 'Evoluir' })
      expect(client.products).toBeDefined()
    })

    it('exposes an orders property', () => {
      const client = new TinyClient({ token: TOKEN, plan: 'Evoluir' })
      expect(client.orders).toBeDefined()
    })
  })

  // ── HTTP client selection ─────────────────────────────────────────────────

  describe('httpClient selection', () => {
    it('uses FetchHttpClient by default when no httpClient is provided', async () => {
      // Stub fetch so FetchHttpClient does not make real network calls
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      }))

      const client = new TinyClient({ token: TOKEN, plan: 'Evoluir' })
      await client.executor.execute({ path: '/produtos', method: 'GET' })

      expect(fetch).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('uses the provided httpClient instead of FetchHttpClient', async () => {
      const customHttpClient = makeHttpClient()
      const client = new TinyClient({ token: TOKEN, plan: 'Evoluir', httpClient: customHttpClient })

      await client.executor.execute({ path: '/produtos', method: 'GET' })

      expect(customHttpClient.request).toHaveBeenCalledOnce()
    })

    it('does not instantiate FetchHttpClient when a custom httpClient is provided', () => {
      const spy = vi.spyOn(FetchHttpClient.prototype, 'request')
      const customHttpClient = makeHttpClient()

      new TinyClient({ token: TOKEN, plan: 'Evoluir', httpClient: customHttpClient })

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  // ── Token injection ───────────────────────────────────────────────────────

  describe('token injection', () => {
    it('injects the token into the request URL via the executor', async () => {
      const httpClient = makeHttpClient()
      const client = new TinyClient({ token: 'super-secret', plan: 'Evoluir', httpClient })

      await client.executor.execute({ path: '/produtos', method: 'GET' })

      const [called] = vi.mocked(httpClient.request).mock.calls[0] as [{ url: string }][]
      expect(called.url).toContain('token=super-secret')
    })
  })

  // ── Rate limiting ─────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('rejects execute() with TinyRateLimitError for Começar plan', async () => {
      const { TinyRateLimitError } = await import('../../src/errors')
      const httpClient = makeHttpClient()
      const client = new TinyClient({ token: TOKEN, plan: 'Começar', httpClient })

      await expect(
        client.executor.execute({ path: '/produtos', method: 'GET' }),
      ).rejects.toBeInstanceOf(TinyRateLimitError)
    })

    it('allows execute() for paid plans', async () => {
      const httpClient = makeHttpClient()
      const client = new TinyClient({ token: TOKEN, plan: 'Crescer', httpClient })

      await expect(
        client.executor.execute({ path: '/produtos', method: 'GET' }),
      ).resolves.toBeDefined()
    })
  })
})
