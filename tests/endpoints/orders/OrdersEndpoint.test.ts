import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrdersEndpoint } from '../../../src/endpoints/orders/OrdersEndpoint'
import type { RequestExecutor } from '../../../src/client/RequestExecutor'
import { TinyApiError } from '../../../src/errors'
import type { OrderItem } from '../../../src/types/orders'

// ── Mock executor ─────────────────────────────────────────────────────────────

function makeExecutor(resolveWith: unknown): RequestExecutor {
  return { execute: vi.fn().mockResolvedValue(resolveWith) } as unknown as RequestExecutor
}

function makeFailing(error: Error): RequestExecutor {
  return { execute: vi.fn().mockRejectedValue(error) } as unknown as RequestExecutor
}

// ── Tiny API response factories ───────────────────────────────────────────────

const OK_ORDER = {
  id: 1,
  numero: '000123',
  situacao: 'Em aberto',
  data_pedido: '15/03/2024',
  nome: 'João Silva',
  id_contato: 'C001',
  valor: '119.80',
  itens: [
    {
      item: {
        id: 10,
        descricao: 'Camiseta Polo',
        quantidade: '2.00',
        valor_unitario: '59.90',
        valor: '119.80',
      },
    },
  ],
}

function searchResponse(overrides = {}) {
  return {
    retorno: {
      status: 'OK',
      pagina: 1,
      numero_paginas: 2,
      pedidos: [{ pedido: OK_ORDER }],
      ...overrides,
    },
  }
}

function getOrderResponse(overrides = {}) {
  return { retorno: { status: 'OK', pedido: { ...OK_ORDER, ...overrides } } }
}

function createResponse(id = 55) {
  return {
    retorno: {
      status: 'OK',
      registros: [{ registro: { id, sequencia: 1, numero: '000124', status: 'Pedido gerado com sucesso' } }],
    },
  }
}

function statusResponse(status = 'OK') {
  return { retorno: { status } }
}

const SAMPLE_ITEMS: OrderItem[] = [
  { productId: '10', productName: 'Camiseta Polo', quantity: 2, unitPrice: 59.9, totalPrice: 119.8 },
]

// ─────────────────────────────────────────────────────────────────────────────

describe('OrdersEndpoint', () => {

  // ── 1. searchOrders ─────────────────────────────────────────────────────────

  describe('searchOrders', () => {
    it('calls /pedidos.pesquisar with GET', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({})
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pedidos.pesquisar', method: 'GET' }),
      )
    })

    it('converts status to PT situacao param', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({ status: 'open' })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ situacao: 'Em aberto' }) }),
      )
    })

    it.each([
      ['approved', 'Aprovado'],
      ['cancelled', 'Cancelado'],
      ['invoiced', 'Faturado'],
      ['shipped', 'Enviado'],
      ['delivered', 'Entregue'],
    ] as const)('maps status "%s" to situacao "%s"', async (status, situacao) => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({ status })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ situacao }) }),
      )
    })

    it('passes page as pagina param', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({ page: 3 })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ pagina: '3' }) }),
      )
    })

    it('converts startDate ISO to dataInicial DD/MM/YYYY', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({ startDate: '2024-01-15' })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ dataInicial: '15/01/2024' }) }),
      )
    })

    it('converts endDate ISO to dataFinal DD/MM/YYYY', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({ endDate: '2024-12-31' })
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.objectContaining({ dataFinal: '31/12/2024' }) }),
      )
    })

    it('omits optional params when not provided', async () => {
      const executor = makeExecutor(searchResponse())
      await new OrdersEndpoint(executor).searchOrders({})
      const [call] = vi.mocked(executor.execute).mock.calls
      const params = call[0].params as Record<string, string>
      expect(params['situacao']).toBeUndefined()
      expect(params['pagina']).toBeUndefined()
      expect(params['dataInicial']).toBeUndefined()
      expect(params['dataFinal']).toBeUndefined()
    })

    it('returns mapped orders, page, and numberOfPages', async () => {
      const result = await new OrdersEndpoint(makeExecutor(searchResponse())).searchOrders({})
      expect(result.page).toBe(1)
      expect(result.numberOfPages).toBe(2)
      expect(result.orders).toHaveLength(1)
      expect(result.orders[0].number).toBe('000123')
      expect(result.orders[0].status).toBe('open')
    })

    it('returns empty orders array when Tiny returns no pedidos', async () => {
      const result = await new OrdersEndpoint(
        makeExecutor(searchResponse({ pedidos: undefined })),
      ).searchOrders({})
      expect(result.orders).toEqual([])
    })

    it('throws TinyApiError when status is not OK', async () => {
      await expect(
        new OrdersEndpoint(makeExecutor(searchResponse({ status: 'Erro' }))).searchOrders({}),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 2. getOrder ─────────────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('calls /pedido.obter with GET and id param', async () => {
      const executor = makeExecutor(getOrderResponse())
      await new OrdersEndpoint(executor).getOrder('42')
      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pedido.obter', method: 'GET', params: { id: '42' } }),
      )
    })

    it('returns the mapped order', async () => {
      const order = await new OrdersEndpoint(makeExecutor(getOrderResponse())).getOrder('1')
      expect(order.id).toBe('1')
      expect(order.number).toBe('000123')
      expect(order.status).toBe('open')
      expect(order.customerName).toBe('João Silva')
      expect(order.items).toHaveLength(1)
    })

    it('throws TinyApiError when status is not OK', async () => {
      const executor = makeExecutor({ retorno: { status: 'Erro', pedido: OK_ORDER } })
      await expect(new OrdersEndpoint(executor).getOrder('1')).rejects.toThrow(TinyApiError)
    })
  })

  // ── 3. createOrder ──────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('calls /pedido.incluir with POST', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).createOrder({
        status: 'open',
        items: SAMPLE_ITEMS,
        total: 119.8,
        customerName: 'João',
        customerId: 'C001',
      })

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/pedido.incluir', method: 'POST' }),
      )
    })

    it('sends situacao in the body', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).createOrder({ status: 'approved', items: [], total: 0 })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as { pedido: { situacao: string } }
      expect(body.pedido.situacao).toBe('Aprovado')
    })

    it('sends items translated to Tiny format', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).createOrder({ status: 'open', items: SAMPLE_ITEMS, total: 119.8 })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: { itens: Array<{ item: { descricao: string; quantidade: string; valor_unitario: string } }> }
      }
      expect(body.pedido.itens[0].item).toMatchObject({
        descricao: 'Camiseta Polo',
        quantidade: '2',
        valor_unitario: '59.9',
      })
    })

    it('sends customerName as nome and customerId as id_contato', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).createOrder({
        status: 'open',
        items: [],
        total: 0,
        customerName: 'Maria',
        customerId: 'C999',
      })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: { nome: string; id_contato: string }
      }
      expect(body.pedido.nome).toBe('Maria')
      expect(body.pedido.id_contato).toBe('C999')
    })

    it('fetches the created order by id after creation', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(88))
        .mockResolvedValueOnce(getOrderResponse({ id: 88 }))

      await new OrdersEndpoint(executor).createOrder({ status: 'open', items: [], total: 0 })

      expect(executor.execute).toHaveBeenCalledTimes(2)
      const secondCall = vi.mocked(executor.execute).mock.calls[1]
      expect(secondCall[0]).toMatchObject({ path: '/pedido.obter', params: { id: '88' } })
    })

    it('returns the freshly fetched order', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(createResponse(1))
        .mockResolvedValueOnce(getOrderResponse())

      const result = await new OrdersEndpoint(executor).createOrder({ status: 'open', items: [], total: 0 })
      expect(result.number).toBe('000123')
    })

    it('throws TinyApiError when create status is not OK', async () => {
      await expect(
        new OrdersEndpoint(makeExecutor(statusResponse('Erro'))).createOrder({
          status: 'open', items: [], total: 0,
        }),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── 4. updateOrder ──────────────────────────────────────────────────────────

  describe('updateOrder', () => {
    it('calls /pedido.alterar with POST, id, and translated fields', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('7', { status: 'invoiced' })

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/pedido.alterar',
          method: 'POST',
          body: expect.objectContaining({
            pedido: expect.objectContaining({ id: '7', situacao: 'Faturado' }),
          }),
        }),
      )
    })

    it('fetches the updated order after alteration', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('7', { status: 'shipped' })

      const secondCall = vi.mocked(executor.execute).mock.calls[1]
      expect(secondCall[0]).toMatchObject({ path: '/pedido.obter', params: { id: '7' } })
    })

    it('returns the freshly fetched order', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      const result = await new OrdersEndpoint(executor).updateOrder('7', { status: 'cancelled' })
      expect(result.number).toBe('000123')
    })

    it('includes items in update body when provided', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('7', { items: SAMPLE_ITEMS })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: { itens: unknown[] }
      }
      expect(body.pedido.itens).toHaveLength(1)
    })

    it('omits situacao from body when status is not provided', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('7', { customerName: 'Ana' })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: Record<string, unknown>
      }
      expect(body.pedido['situacao']).toBeUndefined()
    })

    it('throws TinyApiError when update status is not OK', async () => {
      await expect(
        new OrdersEndpoint(makeExecutor(statusResponse('Erro'))).updateOrder('7', { status: 'open' }),
      ).rejects.toThrow(TinyApiError)
    })
  })

  // ── toApiBody — customer field edge cases ────────────────────────────────────

  describe('toApiBody — customer fields', () => {
    it('sets nome=undefined when customerName is empty string', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('1', { customerName: '' })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: Record<string, unknown>
      }
      expect(body.pedido['nome']).toBeUndefined()
    })

    it('sets id_contato=undefined when customerId is empty string', async () => {
      const executor = makeExecutor(null)
      vi.mocked(executor.execute)
        .mockResolvedValueOnce(statusResponse())
        .mockResolvedValueOnce(getOrderResponse())

      await new OrdersEndpoint(executor).updateOrder('1', { customerId: '' })

      const body = vi.mocked(executor.execute).mock.calls[0][0].body as {
        pedido: Record<string, unknown>
      }
      expect(body.pedido['id_contato']).toBeUndefined()
    })
  })

  // ── Executor error propagation ───────────────────────────────────────────────

  describe('executor error propagation', () => {
    const methods: Array<[string, (ep: OrdersEndpoint) => Promise<unknown>]> = [
      ['searchOrders', ep => ep.searchOrders({})],
      ['getOrder', ep => ep.getOrder('1')],
      ['updateOrder', ep => ep.updateOrder('1', { status: 'open' })],
    ]

    it.each(methods)('%s propagates errors thrown by executor', async (_name, call) => {
      const executor = makeFailing(new TinyApiError('HTTP 500', 'HTTP_500'))
      await expect(call(new OrdersEndpoint(executor))).rejects.toThrow(TinyApiError)
    })
  })
})
