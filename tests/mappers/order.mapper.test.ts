import { describe, it, expect } from 'vitest'
import {
  mapOrder,
  mapOrders,
  parseTinyDate,
} from '../../src/mappers/order.mapper'
import type { ApiOrder, ApiOrderItem, ApiOrderWrapper } from '../../src/mappers/order.mapper'
import { TinyMappingError } from '../../src/errors'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeApiItem(overrides: Partial<ApiOrderItem['item']> = {}): ApiOrderItem {
  return {
    item: {
      id: 10,
      descricao: 'Camiseta Polo',
      quantidade: '2.00',
      valor_unitario: '59.90',
      valor: '119.80',
      ...overrides,
    },
  }
}

function makeApiOrder(overrides: Partial<ApiOrder> = {}): ApiOrder {
  return {
    id: 456,
    numero: '000123',
    situacao: 'Em aberto',
    data_pedido: '15/03/2024',
    nome: 'João Silva',
    id_contato: 'C001',
    valor: '119.80',
    itens: [makeApiItem()],
    ...overrides,
  }
}

// ── parseTinyDate ─────────────────────────────────────────────────────────────

describe('parseTinyDate', () => {
  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(parseTinyDate('15/03/2024')).toBe('2024-03-15')
  })

  it('handles single-digit day and month', () => {
    expect(parseTinyDate('01/01/2023')).toBe('2023-01-01')
  })

  it('throws TinyMappingError for an invalid format (no slashes)', () => {
    expect(() => parseTinyDate('20240315')).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError for a partially empty date', () => {
    expect(() => parseTinyDate('15//2024')).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError for an empty string', () => {
    expect(() => parseTinyDate('')).toThrow(TinyMappingError)
  })
})

// ── mapOrder — status mapping ─────────────────────────────────────────────────

describe('mapOrder — situacao mapping', () => {
  const statusCases: Array<[string, string]> = [
    ['Em aberto', 'open'],
    ['Aprovado', 'approved'],
    ['Preparando envio', 'approved'],
    ['Faturado', 'invoiced'],
    ['Pronto para envio', 'shipped'],
    ['Enviado', 'shipped'],
    ['Entregue', 'delivered'],
    ['Não entregue', 'cancelled'],
    ['Cancelado', 'cancelled'],
    ['Cancelado pelo marketplace', 'cancelled'],
  ]

  it.each(statusCases)('maps situacao "%s" to status "%s"', (situacao, expected) => {
    const result = mapOrder(makeApiOrder({ situacao }))
    expect(result.status).toBe(expected)
  })

  it('throws TinyMappingError for an unknown situacao', () => {
    expect(() => mapOrder(makeApiOrder({ situacao: 'Status Desconhecido' }))).toThrow(
      TinyMappingError,
    )
  })

  it('includes field name "situacao" in the mapping error', () => {
    let err: TinyMappingError | undefined
    try {
      mapOrder(makeApiOrder({ situacao: 'Novo Status' }))
    } catch (e) {
      err = e as TinyMappingError
    }
    expect(err?.message).toContain('situacao')
  })
})

// ── mapOrder — id ─────────────────────────────────────────────────────────────

describe('mapOrder — id', () => {
  it('converts numeric id to string', () => {
    expect(mapOrder(makeApiOrder({ id: 789 })).id).toBe('789')
  })

  it('accepts string id', () => {
    expect(mapOrder(makeApiOrder({ id: '789' })).id).toBe('789')
  })
})

// ── mapOrder — dates ──────────────────────────────────────────────────────────

describe('mapOrder — dates', () => {
  it('converts data_pedido to ISO createdAt', () => {
    expect(mapOrder(makeApiOrder({ data_pedido: '20/06/2023' })).createdAt).toBe('2023-06-20')
  })

  it('uses data_alteracao as updatedAt when present', () => {
    const result = mapOrder(makeApiOrder({ data_pedido: '01/01/2024', data_alteracao: '15/01/2024' }))
    expect(result.createdAt).toBe('2024-01-01')
    expect(result.updatedAt).toBe('2024-01-15')
  })

  it('falls back to createdAt for updatedAt when data_alteracao is absent', () => {
    const result = mapOrder(makeApiOrder({ data_pedido: '01/01/2024', data_alteracao: undefined }))
    expect(result.updatedAt).toBe(result.createdAt)
  })
})

// ── mapOrder — total (valor) ──────────────────────────────────────────────────

describe('mapOrder — total', () => {
  it('parses valor as a float', () => {
    expect(mapOrder(makeApiOrder({ valor: '250.00' })).total).toBe(250)
  })

  it('parses valor with comma decimal separator', () => {
    expect(mapOrder(makeApiOrder({ valor: '250,50' })).total).toBe(250.5)
  })

  it('throws TinyMappingError when valor is not numeric', () => {
    expect(() => mapOrder(makeApiOrder({ valor: 'abc' }))).toThrow(TinyMappingError)
  })

  it('includes field name "valor" in the mapping error for order total', () => {
    let err: TinyMappingError | undefined
    try {
      mapOrder(makeApiOrder({ valor: 'abc' }))
    } catch (e) {
      err = e as TinyMappingError
    }
    expect(err?.message).toContain('valor')
  })
})

// ── mapOrder — optional customer fields ───────────────────────────────────────

describe('mapOrder — customer fields', () => {
  it('maps nome to customerName', () => {
    expect(mapOrder(makeApiOrder({ nome: 'Maria Oliveira' })).customerName).toBe('Maria Oliveira')
  })

  it('returns customerName=undefined when nome is empty string', () => {
    expect(mapOrder(makeApiOrder({ nome: '' })).customerName).toBeUndefined()
  })

  it('returns customerName=undefined when nome is absent', () => {
    expect(mapOrder(makeApiOrder({ nome: undefined })).customerName).toBeUndefined()
  })

  it('maps id_contato to customerId', () => {
    expect(mapOrder(makeApiOrder({ id_contato: 'C042' })).customerId).toBe('C042')
  })

  it('returns customerId=undefined when id_contato is empty string', () => {
    expect(mapOrder(makeApiOrder({ id_contato: '' })).customerId).toBeUndefined()
  })

  it('returns customerId=undefined when id_contato is absent', () => {
    expect(mapOrder(makeApiOrder({ id_contato: undefined })).customerId).toBeUndefined()
  })
})

// ── mapOrder — items ──────────────────────────────────────────────────────────

describe('mapOrder — items', () => {
  it('maps a single item correctly', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem()] }))
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
      productId: '10',
      productName: 'Camiseta Polo',
      quantity: 2,
      unitPrice: 59.9,
      totalPrice: 119.8,
    })
  })

  it('converts numeric item id to string', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem({ id: 99 })] }))
    expect(result.items[0].productId).toBe('99')
  })

  it('maps multiple items', () => {
    const itens = [
      makeApiItem({ id: 1, descricao: 'Item A', quantidade: '1.00', valor_unitario: '10.00', valor: '10.00' }),
      makeApiItem({ id: 2, descricao: 'Item B', quantidade: '3.00', valor_unitario: '20.00', valor: '60.00' }),
    ]
    const result = mapOrder(makeApiOrder({ itens }))
    expect(result.items).toHaveLength(2)
    expect(result.items[1].totalPrice).toBe(60)
  })

  it('returns empty items array when itens is absent', () => {
    expect(mapOrder(makeApiOrder({ itens: undefined })).items).toEqual([])
  })

  it('returns empty items array when itens is empty', () => {
    expect(mapOrder(makeApiOrder({ itens: [] })).items).toEqual([])
  })

  it('throws TinyMappingError when item quantidade is not numeric', () => {
    const badItem = makeApiItem({ quantidade: 'abc' })
    expect(() => mapOrder(makeApiOrder({ itens: [badItem] }))).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError when item valor_unitario is not numeric', () => {
    const badItem = makeApiItem({ valor_unitario: 'xyz' })
    expect(() => mapOrder(makeApiOrder({ itens: [badItem] }))).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError when item valor is not numeric', () => {
    const badItem = makeApiItem({ valor: '???' })
    expect(() => mapOrder(makeApiOrder({ itens: [badItem] }))).toThrow(TinyMappingError)
  })
})

// ── mapOrder — full shape ─────────────────────────────────────────────────────

describe('mapOrder — full shape', () => {
  it('maps a fully populated order correctly', () => {
    const result = mapOrder(makeApiOrder())
    expect(result).toEqual({
      id: '456',
      number: '000123',
      status: 'open',
      createdAt: '2024-03-15',
      updatedAt: '2024-03-15',
      items: [
        {
          productId: '10',
          productName: 'Camiseta Polo',
          quantity: 2,
          unitPrice: 59.9,
          totalPrice: 119.8,
        },
      ],
      total: 119.8,
      customerId: 'C001',
      customerName: 'João Silva',
    })
  })
})

// ── mapOrders ─────────────────────────────────────────────────────────────────

describe('mapOrders', () => {
  it('maps an array of order wrappers', () => {
    const wrappers: ApiOrderWrapper[] = [
      { pedido: makeApiOrder({ id: 1, numero: '000001' }) },
      { pedido: makeApiOrder({ id: 2, numero: '000002', situacao: 'Aprovado' }) },
    ]
    const result = mapOrders(wrappers)
    expect(result).toHaveLength(2)
    expect(result[0].number).toBe('000001')
    expect(result[1].status).toBe('approved')
  })

  it('returns an empty array for an empty input', () => {
    expect(mapOrders([])).toEqual([])
  })
})
