import { describe, it, expect, vi } from 'vitest'
import { ProductsEndpoint } from '../../../src/endpoints/products/ProductsEndpoint'
import type { RequestExecutor } from '../../../src/client/RequestExecutor'
import { TinyApiError } from '../../../src/errors'

// ── Mock executor ──────────────────────────────────────────────────────────────

function makeExecutor(resolveWith: unknown): RequestExecutor {
  return { execute: vi.fn().mockResolvedValue(resolveWith) } as unknown as RequestExecutor
}

function makeFailing(error: Error): RequestExecutor {
  return { execute: vi.fn().mockRejectedValue(error) } as unknown as RequestExecutor
}

// ── Tiny API response factories ────────────────────────────────────────────────

const OK_PRODUCT = {
  id: 1,
  nome: 'Camiseta Polo',
  codigo: 'CAM001',
  preco: '59.90',
  unidade: 'UN',
  peso_bruto: '0.300',
  descricao_complementar: 'Camiseta polo',
  situacao: 'A',
}

function searchResponse(overrides = {}) {
  return {
    retorno: {
      status: 'OK',
      pagina: 1,
      numero_paginas: 3,
      produtos: [{ produto: OK_PRODUCT }],
      ...overrides,
    },
  }
}

function getProductResponse(overrides = {}) {
  return { retorno: { status: 'OK', produto: { ...OK_PRODUCT, ...overrides } } }
}

function createResponse(id = 42) {
  return {
    retorno: {
      status: 'OK',
      registros: [{ registro: { id, sequencia: 1, status: 'Produto cadastrado com sucesso' } }],
    },
  }
}

function statusResponse(status = 'OK') {
  return { retorno: { status } }
}

function stockResponse(saldo: Array<{ saldo: { id_deposito: string; nome_deposito: string; saldo: number } }> = []) {
  return {
    retorno: {
      status: 'OK',
      produto: { id: 1, saldo },
    },
  }
}

function structureResponse(estrutura: unknown = []) {
  return { retorno: { status: 'OK', produto: { estrutura } } }
}

function stockUpdatesResponse(atualizacoes?: Array<{ atualizacao: { id: number; quantidade: number } }>) {
  return { retorno: { status: 'OK', atualizacoes } }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductsEndpoint', () => {
  // ── 1. searchProducts ───────────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('calls /produtos.pesquisar with GET', async () => {
      const executor = makeExecutor(searchResponse())
      await new ProductsEndpoint(executor).searchProducts({})
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produtos.pesquisar', method: 'GET' }),
      )
    })

    it('passes query as pesquisa param', async () => {
      const executor = makeExecutor(searchResponse())
      await new ProductsEndpoint(executor).searchProducts({ query: 'camisa' })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ pesquisa: 'camisa' }) }),
      )
    })

    it('passes page as pagina param', async () => {
      const executor = makeExecutor(searchResponse())
      await new ProductsEndpoint(executor).searchProducts({ page: 2 })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ pagina: '2' }) }),
      )
    })

    it('omits pesquisa when query is not provided', async () => {
      const executor = makeExecutor(searchResponse())
      await new ProductsEndpoint(executor).searchProducts({})
      const [call] = vi.mocked(executor.execute).mock.calls
      expect((call[0].params as Record<string, string>)['pesquisa']).toBeUndefined()
    })

    it('returns mapped products, page, and numberOfPages', async () => {
      const result = await new ProductsEndpoint(makeExecutor(searchResponse())).searchProducts({})
      expect(result.page).toBe(1)
      expect(result.numberOfPages).toBe(3)
      expect(result.products).toHaveLength(1)
      expect(result.products[0].name).toBe('Camiseta Polo')
    })

    it('returns empty products array when Tiny returns no produtos', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(searchResponse({ produtos: undefined })),
      ).searchProducts({})
      expect(result.products).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(searchResponse({ status: 'Erro' }))).searchProducts({}),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 2. getProduct ───────────────────────────────────────────────────────────

  describe('getProduct', () => {
    it('calls /produto.obter with GET and id param', async () => {
      const executor = makeExecutor(getProductResponse())
      await new ProductsEndpoint(executor).getProduct('99')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produto.obter', method: 'GET', params: { id: '99' } }),
      )
    })

    it('returns the mapped product', async () => {
      const product = await new ProductsEndpoint(makeExecutor(getProductResponse())).getProduct('1')
      expect(product.id).toBe('1')
      expect(product.name).toBe('Camiseta Polo')
      expect(product.status).toBe('active')
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(
          makeExecutor({ retorno: { status: 'Erro', produto: OK_PRODUCT } }),
        ).getProduct('1'),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 3. createProduct ────────────────────────────────────────────────────────

  describe('createProduct', () => {
    it('calls /produto.incluir with POST and translated body', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse())
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).createProduct({
        name: 'Camiseta Polo',
        status: 'active',
        price: 59.9,
        sku: 'CAM001',
        unit: 'UN',
        grossWeight: 0.3,
        description: 'Desc',
      })

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produto.incluir',
          method: 'POST',
          body: expect.objectContaining({
            produto: expect.objectContaining({ nome: 'Camiseta Polo', situacao: 'A' }),
          }),
        }),
      )
    })

    it('fetches the created product by id after creation', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(77))
        .mockResolvedValueOnce(getProductResponse({ id: 77 }))

      await new ProductsEndpoint(executor).createProduct({ name: 'X', status: 'inactive' })

      expect(executor.execute).toHaveBeenCalledTimes(2)
      const secondCall = vi.mocked(executor.execute).mock.calls[1]
      expect(secondCall[0]).toMatchObject({ path: '/produto.obter', params: { id: '77' } })
    })

    it('returns the freshly fetched product', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getProductResponse())

      const result = await new ProductsEndpoint(executor).createProduct({ name: 'X', status: 'active' })
      expect(result.name).toBe('Camiseta Polo')
    })

    it('throws TinyApiError when create status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(statusResponse('Erro'))).createProduct({ name: 'X', status: 'active' }),
      ).rejects.toThrow(TinyApiError)
    })

    it('maps status="inactive" to situacao "I"', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).createProduct({ name: 'X', status: 'inactive' })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as { produto: { situacao: string } }
      expect(body.produto.situacao).toBe('I')
    })

    it('omits undefined optional fields from the body', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).createProduct({ name: 'X', status: 'active' })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as { produto: Record<string, unknown> }
      expect(body.produto.preco).toBeUndefined()
      expect(body.produto.peso_bruto).toBeUndefined()
    })

    it('maps new fields into the body correctly', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).createProduct({
        name: 'X',
        status: 'active',
        salePrice: 49.9,
        ncm: '6109.10.00',
        brand: 'Nike',
        packagingType: 'box',
        packagingHeight: 10,
        packagingWidth: 20,
        packagingLength: 30,
        minStock: 5,
        maxStock: 100,
        madeToOrder: true,
        preparationDays: 2,
        seoTitle: 'SEO Title',
        netWeight: 0.2,
        grossWeight: 0.3,
      })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as { produto: Record<string, unknown> }
      expect(body.produto.preco_promocional).toBe('49.9')
      expect(body.produto.ncm).toBe('6109.10.00')
      expect(body.produto.marca).toBe('Nike')
      expect(body.produto.tipoEmbalagem).toBe('2')
      expect(body.produto.alturaEmbalagem).toBe('10')
      expect(body.produto.larguraEmbalagem).toBe('20')
      expect(body.produto.comprimentoEmbalagem).toBe('30')
      expect(body.produto.estoque_minimo).toBe('5')
      expect(body.produto.estoque_maximo).toBe('100')
      expect(body.produto.sob_encomenda).toBe('S')
      expect(body.produto.dias_preparacao).toBe('2')
      expect(body.produto.seo_title).toBe('SEO Title')
      expect(body.produto.peso_liquido).toBe('0.2')
      expect(body.produto.peso_bruto).toBe('0.3')
    })
  })

  // ── 4. updateProduct ────────────────────────────────────────────────────────

  describe('updateProduct', () => {
    it('calls /produto.alterar with POST, id, and translated fields', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).updateProduct('5', { name: 'Novo Nome', price: 79.9 })

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produto.alterar',
          method: 'POST',
          body: expect.objectContaining({
            produto: expect.objectContaining({ id: '5', nome: 'Novo Nome', preco: '79.9' }),
          }),
        }),
      )
    })

    it('fetches the updated product after alteration', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).updateProduct('5', { name: 'X' })
      const secondCall = vi.mocked(executor.execute).mock.calls[1]
      expect(secondCall[0]).toMatchObject({ path: '/produto.obter', params: { id: '5' } })
    })

    it('returns the freshly fetched product', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getProductResponse())

      const result = await new ProductsEndpoint(executor).updateProduct('5', { name: 'X' })
      expect(result.name).toBe('Camiseta Polo')
    })

    it('throws TinyApiError when update status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(statusResponse('Erro'))).updateProduct('5', { name: 'X' }),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 5. getStock ─────────────────────────────────────────────────────────────

  describe('getStock', () => {
    it('calls /produto.obter.estoque with GET and id param', async () => {
      const executor = makeExecutor(stockResponse([]))
      await new ProductsEndpoint(executor).getStock('10')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produto.obter.estoque', method: 'GET', params: { id: '10' } }),
      )
    })

    it('sums stock across all deposits', async () => {
      const saldo = [
        { saldo: { id_deposito: '1', nome_deposito: 'Dep A', saldo: 10 } },
        { saldo: { id_deposito: '2', nome_deposito: 'Dep B', saldo: 5 } },
      ]
      const result = await new ProductsEndpoint(makeExecutor(stockResponse(saldo))).getStock('1')
      expect(result.quantity).toBe(15)
    })

    it('returns quantity=0 when no deposits exist', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse([]))).getStock('1')
      expect(result.quantity).toBe(0)
    })

    it('returns the productId as string', async () => {
      const executor = makeExecutor({ retorno: { status: 'OK', produto: { id: 99, saldo: [] } } })
      const result = await new ProductsEndpoint(executor).getStock('99')
      expect(result.productId).toBe('99')
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(
          makeExecutor({ retorno: { status: 'Erro', produto: { id: 1, saldo: [] } } }),
        ).getStock('1'),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 6. getStructure ─────────────────────────────────────────────────────────

  describe('getStructure', () => {
    it('calls /produto.obter.estrutura with GET and id param', async () => {
      const executor = makeExecutor(structureResponse())
      await new ProductsEndpoint(executor).getStructure('7')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produto.obter.estrutura', method: 'GET', params: { id: '7' } }),
      )
    })

    it('returns the raw estrutura data', async () => {
      const estrutura = [{ componente: { id: 1, nome: 'Tecido', quantidade: 1.5 } }]
      const result = await new ProductsEndpoint(makeExecutor(structureResponse(estrutura))).getStructure('7')
      expect(result).toEqual(estrutura)
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(
          makeExecutor({ retorno: { status: 'Erro', produto: { estrutura: [] } } }),
        ).getStructure('7'),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 7. getChangedProducts ────────────────────────────────────────────────────

  describe('getChangedProducts', () => {
    it('calls /produtos.pesquisar with dataAlteracao in DD/MM/YYYY format', async () => {
      const executor = makeExecutor(searchResponse())
      await new ProductsEndpoint(executor).getChangedProducts('2024-03-15')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produtos.pesquisar',
          method: 'GET',
          params: { dataAlteracao: '15/03/2024' },
        }),
      )
    })

    it('returns mapped products', async () => {
      const result = await new ProductsEndpoint(makeExecutor(searchResponse())).getChangedProducts('2024-01-01')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Camiseta Polo')
    })

    it('returns empty array when Tiny returns no produtos', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(searchResponse({ produtos: undefined })),
      ).getChangedProducts('2024-01-01')
      expect(result).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(searchResponse({ status: 'Erro' }))).getChangedProducts('2024-01-01'),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 8. getStockUpdates ──────────────────────────────────────────────────────

  describe('getStockUpdates', () => {
    it('calls /produto.atualizacoes.estoque with dataAlteracao in DD/MM/YYYY format', async () => {
      const executor = makeExecutor(stockUpdatesResponse())
      await new ProductsEndpoint(executor).getStockUpdates('2024-06-01')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produto.atualizacoes.estoque',
          method: 'GET',
          params: { dataAlteracao: '01/06/2024' },
        }),
      )
    })

    it('returns mapped stock updates', async () => {
      const atualizacoes = [
        { atualizacao: { id: 1, quantidade: 10 } },
        { atualizacao: { id: 2, quantidade: 5 } },
      ]
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse(atualizacoes)),
      ).getStockUpdates('2024-01-01')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ productId: '1', quantity: 10 })
      expect(result[1]).toEqual({ productId: '2', quantity: 5 })
    })

    it('returns empty array when atualizacoes is absent', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse(undefined)),
      ).getStockUpdates('2024-01-01')
      expect(result).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor({ retorno: { status: 'Erro' } })).getStockUpdates('2024-01-01'),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 9. updateStock ──────────────────────────────────────────────────────────

  describe('updateStock', () => {
    it('calls /produto.atualizar.estoque with POST, id and quantity as string', async () => {
      const executor = makeExecutor(statusResponse())
      await new ProductsEndpoint(executor).updateStock('3', 25)
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produto.atualizar.estoque',
          method: 'POST',
          body: { produto: { id: '3', quantidade: '25' } },
        }),
      )
    })

    it('resolves void on success', async () => {
      const result = await new ProductsEndpoint(makeExecutor(statusResponse())).updateStock('3', 25)
      expect(result).toBeUndefined()
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(statusResponse('Erro'))).updateStock('3', 25),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 10. updatePrices ────────────────────────────────────────────────────────

  describe('updatePrices', () => {
    it('calls /produto.atualizar.precos with POST, id and price as string', async () => {
      const executor = makeExecutor(statusResponse())
      await new ProductsEndpoint(executor).updatePrices('8', 99.9)
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/produto.atualizar.precos',
          method: 'POST',
          body: { produto: { id: '8', preco: '99.9' } },
        }),
      )
    })

    it('resolves void on success', async () => {
      const result = await new ProductsEndpoint(makeExecutor(statusResponse())).updatePrices('8', 99.9)
      expect(result).toBeUndefined()
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(statusResponse('Erro'))).updatePrices('8', 99.9),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── Propagates executor errors ───────────────────────────────────────────────

  describe('executor error propagation', () => {
    const methods: Array<[string, (ep: ProductsEndpoint) => Promise<unknown>]> = [
      ['searchProducts', ep => ep.searchProducts({})],
      ['getProduct', ep => ep.getProduct('1')],
      ['getStock', ep => ep.getStock('1')],
      ['getStructure', ep => ep.getStructure('1')],
      ['getChangedProducts', ep => ep.getChangedProducts('2024-01-01')],
      ['getStockUpdates', ep => ep.getStockUpdates('2024-01-01')],
      ['updateStock', ep => ep.updateStock('1', 10)],
      ['updatePrices', ep => ep.updatePrices('1', 50)],
    ]

    it.each(methods)('%s propagates errors thrown by executor', async (_name, call) => {
      await expect(call(new ProductsEndpoint(makeFailing(new TinyApiError('HTTP 500', 'HTTP_500'))))).rejects.toThrow(TinyApiError)
    })
  })
})
