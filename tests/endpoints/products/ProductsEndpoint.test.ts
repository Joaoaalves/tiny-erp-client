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

function stockResponse(overrides: Record<string, unknown> = {}) {
  return {
    retorno: {
      status: 'OK',
      produto: {
        id: 1,
        nome: 'Camiseta Polo',
        codigo: 'CAM001',
        unidade: 'UN',
        saldo: 15,
        saldoReservado: 3,
        depositos: [
          { deposito: { nome: 'Depósito A', desconsiderar: 'N', saldo: 10, empresa: 'Tiny' } },
          { deposito: { nome: 'Depósito B', desconsiderar: 'N', saldo: 5 } },
        ],
        ...overrides,
      },
    },
  }
}

function updateStockResponse(status = 'OK') {
  return {
    retorno: {
      status,
      registros: status === 'OK'
        ? [{
            registro: {
              sequencia: '1',
              status: 'Estoque atualizado com sucesso',
              id: 999,
              saldoEstoque: 25,
              saldoReservado: 3,
              registroCriado: true,
            },
          }]
        : undefined,
    },
  }
}

function structureResponse(estrutura: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    retorno: {
      status: 'OK',
      produto: {
        id: 1,
        nome: 'Kit Camiseta',
        codigo: 'KIT001',
        estrutura,
        ...overrides,
      },
    },
  }
}

function stockUpdatesResponse(produtos?: unknown[]) {
  return { retorno: { status: 'OK', produtos } }
}

const SAMPLE_STOCK_UPDATE_PRODUTO = {
  produto: {
    id: 1,
    nome: 'Camiseta Polo',
    codigo: 'CAM001',
    unidade: 'UN',
    tipo_variacao: 'N',
    localizacao: 'Prateleira A',
    data_alteracao: '15/03/2024 10:00:00',
    saldo: 10,
    saldoReservado: 2,
    depositos: [
      { deposito: { nome: 'Depósito A', desconsiderar: 'N', saldo: 10 } },
    ],
  },
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
          queryBody: expect.objectContaining({
            produto: expect.objectContaining({
              produto: expect.objectContaining({ nome: 'Camiseta Polo', situacao: 'A' }),
            }),
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

      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { produto: { produto: { situacao: string } } }
      expect(qb.produto.produto.situacao).toBe('I')
    })

    it('omits undefined optional fields from the body', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getProductResponse())

      await new ProductsEndpoint(executor).createProduct({ name: 'X', status: 'active' })

      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { produto: { produto: Record<string, unknown> } }
      expect(qb.produto.produto.preco).toBeUndefined()
      expect(qb.produto.produto.peso_bruto).toBeUndefined()
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

      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { produto: { produto: Record<string, unknown> } }
      expect(qb.produto.produto.preco_promocional).toBe('49.9')
      expect(qb.produto.produto.ncm).toBe('6109.10.00')
      expect(qb.produto.produto.marca).toBe('Nike')
      expect(qb.produto.produto.tipoEmbalagem).toBe('2')
      expect(qb.produto.produto.alturaEmbalagem).toBe('10')
      expect(qb.produto.produto.larguraEmbalagem).toBe('20')
      expect(qb.produto.produto.comprimentoEmbalagem).toBe('30')
      expect(qb.produto.produto.estoque_minimo).toBe('5')
      expect(qb.produto.produto.estoque_maximo).toBe('100')
      expect(qb.produto.produto.sob_encomenda).toBe('S')
      expect(qb.produto.produto.dias_preparacao).toBe('2')
      expect(qb.produto.produto.seo_title).toBe('SEO Title')
      expect(qb.produto.produto.peso_liquido).toBe('0.2')
      expect(qb.produto.produto.peso_bruto).toBe('0.3')
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
          queryBody: expect.objectContaining({
            produto: expect.objectContaining({
              produtos: expect.arrayContaining([
                expect.objectContaining({
                  produto: expect.objectContaining({ id: '5', nome: 'Novo Nome', preco: '79.9' }),
                }),
              ]),
            }),
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
      const executor = makeExecutor(stockResponse())
      await new ProductsEndpoint(executor).getStock('10')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produto.obter.estoque', method: 'GET', params: { id: '10' } }),
      )
    })

    it('returns productId as string', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse({ id: 99 }))).getStock('99')
      expect(result.productId).toBe('99')
    })

    it('returns product name, sku, and unit', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse())).getStock('1')
      expect(result.name).toBe('Camiseta Polo')
      expect(result.sku).toBe('CAM001')
      expect(result.unit).toBe('UN')
    })

    it('returns sku=undefined when codigo is empty', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse({ codigo: '' }))).getStock('1')
      expect(result.sku).toBeUndefined()
    })

    it('returns total quantity from saldo field', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse({ saldo: 42 }))).getStock('1')
      expect(result.quantity).toBe(42)
    })

    it('returns reservedQuantity from saldoReservado field', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse({ saldoReservado: 7 }))).getStock('1')
      expect(result.reservedQuantity).toBe(7)
    })

    it('returns mapped deposits', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse())).getStock('1')
      expect(result.deposits).toHaveLength(2)
      expect(result.deposits[0]).toMatchObject({
        name: 'Depósito A',
        ignore: false,
        quantity: 10,
        company: 'Tiny',
      })
    })

    it('maps desconsiderar "S" to ignore=true', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockResponse({
          depositos: [{ deposito: { nome: 'Dep', desconsiderar: 'S', saldo: 0 } }],
        })),
      ).getStock('1')
      expect(result.deposits[0].ignore).toBe(true)
    })

    it('maps desconsiderar "N" to ignore=false', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockResponse({
          depositos: [{ deposito: { nome: 'Dep', desconsiderar: 'N', saldo: 5 } }],
        })),
      ).getStock('1')
      expect(result.deposits[0].ignore).toBe(false)
    })

    it('returns company=undefined when empresa is absent', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse())).getStock('1')
      expect(result.deposits[1].company).toBeUndefined()
    })

    it('returns empty deposits array when depositos is empty', async () => {
      const result = await new ProductsEndpoint(makeExecutor(stockResponse({ depositos: [] }))).getStock('1')
      expect(result.deposits).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(
          makeExecutor({ retorno: { status: 'Erro', produto: { id: 1, nome: 'X', saldo: 0, saldoReservado: 0, depositos: [] } } }),
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

    it('returns productId, name, and sku', async () => {
      const result = await new ProductsEndpoint(makeExecutor(structureResponse())).getStructure('7')
      expect(result.productId).toBe('1')
      expect(result.name).toBe('Kit Camiseta')
      expect(result.sku).toBe('KIT001')
    })

    it('returns sku=undefined when codigo is empty', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(structureResponse([], { codigo: '' })),
      ).getStructure('7')
      expect(result.sku).toBeUndefined()
    })

    it('returns mapped components', async () => {
      const estrutura = [
        { id_componente: 10, codigo: 'COMP001', nome: 'Tecido', quantidade: 1.5 },
        { id_componente: 11, nome: 'Botão', quantidade: 4 },
      ]
      const result = await new ProductsEndpoint(makeExecutor(structureResponse(estrutura))).getStructure('7')
      expect(result.components).toHaveLength(2)
      expect(result.components[0]).toMatchObject({
        componentId: '10',
        sku: 'COMP001',
        name: 'Tecido',
        quantity: 1.5,
      })
    })

    it('converts componentId to string', async () => {
      const estrutura = [{ id_componente: 99, nome: 'Peça', quantidade: 1 }]
      const result = await new ProductsEndpoint(makeExecutor(structureResponse(estrutura))).getStructure('7')
      expect(result.components[0].componentId).toBe('99')
    })

    it('parses quantity as float when given as string', async () => {
      const estrutura = [{ id_componente: 1, nome: 'Peça', quantidade: '2.5' }]
      const result = await new ProductsEndpoint(makeExecutor(structureResponse(estrutura))).getStructure('7')
      expect(result.components[0].quantity).toBe(2.5)
    })

    it('returns sku=undefined when component codigo is absent', async () => {
      const estrutura = [{ id_componente: 1, nome: 'Peça', quantidade: 1 }]
      const result = await new ProductsEndpoint(makeExecutor(structureResponse(estrutura))).getStructure('7')
      expect(result.components[0].sku).toBeUndefined()
    })

    it('returns empty components array when estrutura is empty', async () => {
      const result = await new ProductsEndpoint(makeExecutor(structureResponse([]))).getStructure('7')
      expect(result.components).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(
          makeExecutor({ retorno: { status: 'Erro', produto: { id: 1, nome: 'X', estrutura: [] } } }),
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

    it('returns mapped stock updates with all fields', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([SAMPLE_STOCK_UPDATE_PRODUTO])),
      ).getStockUpdates('2024-01-01')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        productId: '1',
        name: 'Camiseta Polo',
        sku: 'CAM001',
        unit: 'UN',
        variationType: 'normal',
        location: 'Prateleira A',
        updatedAt: '15/03/2024 10:00:00',
        quantity: 10,
        reservedQuantity: 2,
      })
    })

    it('maps tipo_variacao "N" to variationType "normal"', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([SAMPLE_STOCK_UPDATE_PRODUTO])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].variationType).toBe('normal')
    })

    it('maps tipo_variacao "P" to variationType "parent"', async () => {
      const p = { produto: { ...SAMPLE_STOCK_UPDATE_PRODUTO.produto, tipo_variacao: 'P' } }
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([p])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].variationType).toBe('parent')
    })

    it('maps tipo_variacao "V" to variationType "variation"', async () => {
      const p = { produto: { ...SAMPLE_STOCK_UPDATE_PRODUTO.produto, tipo_variacao: 'V' } }
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([p])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].variationType).toBe('variation')
    })

    it('returns variationType=undefined for unknown tipo_variacao', async () => {
      const p = { produto: { ...SAMPLE_STOCK_UPDATE_PRODUTO.produto, tipo_variacao: 'X' } }
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([p])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].variationType).toBeUndefined()
    })

    it('returns mapped deposits', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([SAMPLE_STOCK_UPDATE_PRODUTO])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].deposits).toHaveLength(1)
      expect(result[0].deposits[0]).toMatchObject({ name: 'Depósito A', ignore: false, quantity: 10 })
    })

    it('returns empty deposits when depositos is absent', async () => {
      const p = { produto: { ...SAMPLE_STOCK_UPDATE_PRODUTO.produto, depositos: undefined } }
      const result = await new ProductsEndpoint(
        makeExecutor(stockUpdatesResponse([p])),
      ).getStockUpdates('2024-01-01')
      expect(result[0].deposits).toEqual([])
    })

    it('returns empty array when produtos is absent', async () => {
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
    it('calls /produto.atualizar.estoque with POST', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '3', quantity: 25 })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/produto.atualizar.estoque', method: 'POST' }),
      )
    })

    it('sends idProduto and quantidade in estoque queryBody', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '3', quantity: 25 })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.idProduto).toBe('3')
      expect(qb.estoque.estoque.quantidade).toBe(25)
    })

    it('sends tipo "B" when movementType is "balance"', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '1', quantity: 10, movementType: 'balance' })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.tipo).toBe('B')
    })

    it('sends tipo "E" when movementType is "entry"', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '1', quantity: 5, movementType: 'entry' })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.tipo).toBe('E')
    })

    it('sends tipo "S" when movementType is "exit"', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '1', quantity: 3, movementType: 'exit' })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.tipo).toBe('S')
    })

    it('omits tipo when movementType is not provided', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({ productId: '1', quantity: 10 })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.tipo).toBeUndefined()
    })

    it('sends optional fields when provided', async () => {
      const executor = makeExecutor(updateStockResponse())
      await new ProductsEndpoint(executor).updateStock({
        productId: '1',
        quantity: 10,
        date: '2024-03-15',
        unitPrice: 59.9,
        notes: 'Reposição',
        warehouse: 'Depósito Principal',
      })
      const qb = vi.mocked(executor.execute).mock.calls[0][0].queryBody as { estoque: { estoque: Record<string, unknown> } }
      expect(qb.estoque.estoque.data).toBe('2024-03-15')
      expect(qb.estoque.estoque.precoUnitario).toBe(59.9)
      expect(qb.estoque.estoque.observacoes).toBe('Reposição')
      expect(qb.estoque.estoque.deposito).toBe('Depósito Principal')
    })

    it('returns mapped UpdateStockResult', async () => {
      const result = await new ProductsEndpoint(
        makeExecutor(updateStockResponse()),
      ).updateStock({ productId: '1', quantity: 25 })
      expect(result).toMatchObject({
        sequenceId: '1',
        status: 'Estoque atualizado com sucesso',
        movementId: 999,
        balanceAfter: 25,
        reservedBalance: 3,
        isNewRecord: true,
      })
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new ProductsEndpoint(makeExecutor(updateStockResponse('Erro'))).updateStock({ productId: '3', quantity: 25 }),
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
          queryBody: { produto: { produto: { id: '8', preco: '99.9' } } },
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
      ['updateStock', ep => ep.updateStock({ productId: '1', quantity: 10 })],
      ['updatePrices', ep => ep.updatePrices('1', 50)],
    ]

    it.each(methods)('%s propagates errors thrown by executor', async (_name, call) => {
      await expect(call(new ProductsEndpoint(makeFailing(new TinyApiError('HTTP 500', 'HTTP_500'))))).rejects.toThrow(TinyApiError)
    })
  })
})
