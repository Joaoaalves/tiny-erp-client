import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FetchHttpClient } from '../../src/core/FetchHttpClient'
import { TinyApiError, TinyTransportError } from '../../src/errors'

const BASE_URL = 'https://api.tiny.com.br/api2/produtos.pesquisar?token=SECRET'
const SANITIZED_URL = 'https://api.tiny.com.br/api2/produtos.pesquisar?token=***'

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('FetchHttpClient', () => {
  let client: FetchHttpClient

  beforeEach(() => {
    client = new FetchHttpClient()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('successful requests', () => {
    it('returns data and status for a GET request', async () => {
      const payload = { retorno: { produtos: [] } }
      vi.mocked(fetch).mockResolvedValue(makeResponse(payload, 200))

      const result = await client.request({ url: BASE_URL, method: 'GET' })

      expect(result.status).toBe(200)
      expect(result.data).toEqual(payload)
    })

    it('calls fetch with GET method and no body', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({}, 200))

      await client.request({ url: BASE_URL, method: 'GET' })

      expect(fetch).toHaveBeenCalledWith(BASE_URL, {
        method: 'GET',
        headers: undefined,
        body: undefined,
      })
    })

    it('calls fetch with POST method, JSON body and Content-Type header', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ id: '1' }, 200))
      const body = { nome: 'Produto Teste' }

      await client.request({ url: BASE_URL, method: 'POST', body })

      expect(fetch).toHaveBeenCalledWith(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    })

    it('returns correct status code for 201 Created', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ id: '42' }, 201))

      const result = await client.request({ url: BASE_URL, method: 'POST', body: {} })

      expect(result.status).toBe(201)
    })

    it('handles PUT requests', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ updated: true }, 200))

      const result = await client.request({ url: BASE_URL, method: 'PUT', body: { nome: 'x' } })

      expect(result.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(BASE_URL, expect.objectContaining({ method: 'PUT' }))
    })

    it('handles DELETE requests', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ deleted: true }, 200))

      const result = await client.request({ url: BASE_URL, method: 'DELETE' })

      expect(result.status).toBe(200)
    })
  })

  describe('network errors', () => {
    it('throws TinyTransportError when fetch rejects', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'))

      await expect(client.request({ url: BASE_URL, method: 'GET' })).rejects.toThrow(
        TinyTransportError,
      )
    })

    it('includes sanitized URL in TinyTransportError message (no token leak)', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error.message).toContain(SANITIZED_URL)
      expect(error.message).not.toContain('SECRET')
    })

    it('wraps non-Error network failures in TinyTransportError', async () => {
      vi.mocked(fetch).mockRejectedValue('timeout')

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error).toBeInstanceOf(TinyTransportError)
      expect(error.details).toBe('timeout')
    })

    it('sets TRANSPORT_ERROR code on network failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network down'))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error.code).toBe('TRANSPORT_ERROR')
    })
  })

  describe('HTTP error responses', () => {
    it('throws TinyApiError for 400 Bad Request', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ erro: 'bad request' }, 400))

      await expect(client.request({ url: BASE_URL, method: 'GET' })).rejects.toThrow(TinyApiError)
    })

    it('throws TinyApiError for 401 Unauthorized with correct code', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ erro: 'unauthorized' }, 401))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyApiError)

      expect(error.code).toBe('HTTP_401')
    })

    it('throws TinyApiError for 429 Too Many Requests with correct code', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ erro: 'rate limit' }, 429))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyApiError)

      expect(error.code).toBe('HTTP_429')
    })

    it('throws TinyApiError for 500 Internal Server Error', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ erro: 'server error' }, 500))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyApiError)

      expect(error.code).toBe('HTTP_500')
    })

    it('includes sanitized URL in TinyApiError message (no token leak)', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({ erro: 'not found' }, 404))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyApiError)

      expect(error.message).toContain(SANITIZED_URL)
      expect(error.message).not.toContain('SECRET')
    })

    it('attaches API response body as error details', async () => {
      const apiBody = { erro: 'produto nao encontrado', codigo: 404 }
      vi.mocked(fetch).mockResolvedValue(makeResponse(apiBody, 404))

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyApiError)

      expect(error.details).toEqual(apiBody)
    })
  })

  describe('malformed response body', () => {
    it('throws TinyTransportError when response.json() rejects', async () => {
      const brokenResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('invalid json')),
      } as unknown as Response
      vi.mocked(fetch).mockResolvedValue(brokenResponse)

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error).toBeInstanceOf(TinyTransportError)
      expect(error.code).toBe('TRANSPORT_ERROR')
    })

    it('includes sanitized URL in parse error message', async () => {
      const brokenResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('invalid json')),
      } as unknown as Response
      vi.mocked(fetch).mockResolvedValue(brokenResponse)

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error.message).toContain(SANITIZED_URL)
      expect(error.message).not.toContain('SECRET')
    })

    it('wraps non-Error parse failures in TinyTransportError', async () => {
      const brokenResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue('parse failed'),
      } as unknown as Response
      vi.mocked(fetch).mockResolvedValue(brokenResponse)

      const error = await client
        .request({ url: BASE_URL, method: 'GET' })
        .catch(e => e as TinyTransportError)

      expect(error).toBeInstanceOf(TinyTransportError)
      expect(error.details).toBe('parse failed')
    })
  })
})
