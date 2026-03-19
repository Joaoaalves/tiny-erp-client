import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RequestExecutor } from '../../src/client/RequestExecutor'
import type { HttpClient, HttpResponse } from '../../src/types/http'
import type { RateLimiter } from '../../src/types/rate-limit'

const TOKEN = 'my-secret-token'
const BASE_URL = 'https://api.tiny.com.br/api2'

function makeHttpClient<T>(data: T, status = 200): HttpClient {
  return {
    request: vi.fn<HttpClient['request']>().mockResolvedValue({ status, data } as HttpResponse<T>),
  }
}

function makeRateLimiter(rejects?: Error): RateLimiter {
  return {
    acquire: rejects
      ? vi.fn().mockRejectedValue(rejects)
      : vi.fn().mockResolvedValue(undefined),
  }
}

describe('RequestExecutor', () => {
  let rateLimiter: RateLimiter
  let httpClient: HttpClient

  beforeEach(() => {
    rateLimiter = makeRateLimiter()
    httpClient = makeHttpClient({ ok: true })
  })

  // ── URL construction ─────────────────────────────────────────────────────

  describe('buildUrl', () => {
    it('prepends BASE_URL and injects token and formato=json as the first query params', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produtos.pesquisar', method: 'GET' })

      const [calledUrl] = vi.mocked(httpClient.request).mock.calls[0] as [{ url: string }][]
      expect(calledUrl.url).toContain(`${BASE_URL}/produtos.pesquisar?`)
      expect(calledUrl.url).toContain(`token=${TOKEN}`)
      expect(calledUrl.url).toContain('formato=json')
    })

    it('appends extra params after the token', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({
        path: '/produtos.pesquisar',
        method: 'GET',
        params: { pesquisa: 'camisa', pagina: '2' },
      })

      const [called] = vi.mocked(httpClient.request).mock.calls[0] as [{ url: string }][]
      expect(called.url).toContain(`token=${TOKEN}`)
      expect(called.url).toContain('pesquisa=camisa')
      expect(called.url).toContain('pagina=2')
    })

    it('builds a valid URL with no extra params', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produto.obter', method: 'GET' })

      const [called] = vi.mocked(httpClient.request).mock.calls[0] as [{ url: string }][]
      expect(called.url).toContain(`${BASE_URL}/produto.obter?`)
      expect(called.url).toContain(`token=${TOKEN}`)
      expect(called.url).toContain('formato=json')
    })
  })

  // ── Rate limiter ──────────────────────────────────────────────────────────

  describe('rate limiter', () => {
    it('calls acquire() before making the HTTP request', async () => {
      const callOrder: string[] = []

      rateLimiter = {
        acquire: vi.fn().mockImplementation(() => {
          callOrder.push('acquire')
          return Promise.resolve()
        }),
      }
      httpClient = {
        request: vi.fn().mockImplementation(() => {
          callOrder.push('request')
          return Promise.resolve({ status: 200, data: {} })
        }),
      }

      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produtos', method: 'GET' })

      expect(callOrder).toEqual(['acquire', 'request'])
    })

    it('calls acquire() exactly once per execute() call', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produtos', method: 'GET' })
      await executor.execute({ path: '/produtos', method: 'GET' })

      expect(rateLimiter.acquire).toHaveBeenCalledTimes(2)
    })

    it('propagates TinyRateLimitError when acquire() rejects', async () => {
      const rateLimitError = new Error('rate limit exceeded')
      const failingLimiter = makeRateLimiter(rateLimitError)
      const executor = new RequestExecutor(TOKEN, httpClient, failingLimiter)

      await expect(executor.execute({ path: '/produtos', method: 'GET' })).rejects.toThrow(
        'rate limit exceeded',
      )
    })

    it('does not call httpClient.request when acquire() rejects', async () => {
      const failingLimiter = makeRateLimiter(new Error('rate limit'))
      const executor = new RequestExecutor(TOKEN, httpClient, failingLimiter)

      await executor.execute({ path: '/produtos', method: 'GET' }).catch(() => null)

      expect(httpClient.request).not.toHaveBeenCalled()
    })
  })

  // ── HTTP method and body passthrough ─────────────────────────────────────

  describe('HTTP passthrough', () => {
    it('passes GET method to httpClient', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produtos', method: 'GET' })

      expect(vi.mocked(httpClient.request)).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('passes POST method and body to httpClient', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      const body = { nome: 'Produto Teste', preco: '99.90' }
      await executor.execute({ path: '/produto.incluir', method: 'POST', body })

      expect(vi.mocked(httpClient.request)).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', body }),
      )
    })

    it('passes PUT method and body to httpClient', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      const body = { id: '42', nome: 'Novo Nome' }
      await executor.execute({ path: '/produto.alterar', method: 'PUT', body })

      expect(vi.mocked(httpClient.request)).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT', body }),
      )
    })

    it('passes DELETE method to httpClient', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produto.excluir', method: 'DELETE' })

      expect(vi.mocked(httpClient.request)).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('passes undefined body when not provided', async () => {
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)
      await executor.execute({ path: '/produtos', method: 'GET' })

      expect(vi.mocked(httpClient.request)).toHaveBeenCalledWith(
        expect.objectContaining({ body: undefined }),
      )
    })
  })

  // ── Return value ──────────────────────────────────────────────────────────

  describe('return value', () => {
    it('returns response.data unwrapped from HttpResponse', async () => {
      const expectedData = { retorno: { produtos: [{ id: '1', nome: 'Camisa' }] } }
      httpClient = makeHttpClient(expectedData)
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)

      const result = await executor.execute({ path: '/produtos', method: 'GET' })

      expect(result).toEqual(expectedData)
    })

    it('propagates errors thrown by httpClient.request', async () => {
      httpClient = { request: vi.fn().mockRejectedValue(new Error('network down')) }
      const executor = new RequestExecutor(TOKEN, httpClient, rateLimiter)

      await expect(executor.execute({ path: '/produtos', method: 'GET' })).rejects.toThrow(
        'network down',
      )
    })
  })
})
