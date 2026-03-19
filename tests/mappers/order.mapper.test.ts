import { describe, it, expect } from 'vitest'
import {
  mapOrder,
  mapOrders,
  parseTinyDate,
} from '../../src/mappers/order.mapper'
import type { ApiOrder, ApiOrderItem, ApiOrderWrapper } from '../../src/mappers/order.mapper'
import { TinyMappingError } from '../../src/errors'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeApiItem(overrides: Partial<ApiOrderItem['item']> = {}): ApiOrderItem {
  return {
    item: {
      id_produto: 10,
      descricao: 'Camiseta Polo',
      unidade: 'UN',
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

// ── parseTinyDate ──────────────────────────────────────────────────────────────

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

// ── status mapping ─────────────────────────────────────────────────────────────

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
    expect(mapOrder(makeApiOrder({ situacao })).status).toBe(expected)
  })

  it('throws TinyMappingError for an unknown situacao', () => {
    expect(() => mapOrder(makeApiOrder({ situacao: 'Status Desconhecido' }))).toThrow(TinyMappingError)
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

// ── id ─────────────────────────────────────────────────────────────────────────

describe('mapOrder — id', () => {
  it('converts numeric id to string', () => {
    expect(mapOrder(makeApiOrder({ id: 789 })).id).toBe('789')
  })

  it('accepts string id', () => {
    expect(mapOrder(makeApiOrder({ id: '789' })).id).toBe('789')
  })
})

// ── number ─────────────────────────────────────────────────────────────────────

describe('mapOrder — number', () => {
  it('maps numero to number as string', () => {
    expect(mapOrder(makeApiOrder({ numero: '000456' })).number).toBe('000456')
  })

  it('converts numeric numero to string', () => {
    expect(mapOrder(makeApiOrder({ numero: 456 })).number).toBe('456')
  })
})

// ── ecommerceNumber ────────────────────────────────────────────────────────────

describe('mapOrder — ecommerceNumber', () => {
  it('maps numero_ecommerce to ecommerceNumber', () => {
    expect(mapOrder(makeApiOrder({ numero_ecommerce: 'EC-9999' })).ecommerceNumber).toBe('EC-9999')
  })

  it('returns ecommerceNumber=undefined when absent', () => {
    expect(mapOrder(makeApiOrder({ numero_ecommerce: undefined })).ecommerceNumber).toBeUndefined()
  })
})

// ── dates ──────────────────────────────────────────────────────────────────────

describe('mapOrder — dates', () => {
  it('converts data_pedido to ISO createdAt', () => {
    expect(mapOrder(makeApiOrder({ data_pedido: '20/06/2023' })).createdAt).toBe('2023-06-20')
  })

  it('converts data_prevista to estimatedAt', () => {
    expect(mapOrder(makeApiOrder({ data_prevista: '25/06/2023' })).estimatedAt).toBe('2023-06-25')
  })

  it('returns estimatedAt=undefined when data_prevista is absent', () => {
    expect(mapOrder(makeApiOrder({ data_prevista: undefined })).estimatedAt).toBeUndefined()
  })

  it('converts data_faturamento to invoicedAt', () => {
    expect(mapOrder(makeApiOrder({ data_faturamento: '01/07/2023' })).invoicedAt).toBe('2023-07-01')
  })

  it('converts data_envio to shippedAt', () => {
    expect(mapOrder(makeApiOrder({ data_envio: '05/07/2023' })).shippedAt).toBe('2023-07-05')
  })

  it('converts data_entrega to deliveredAt', () => {
    expect(mapOrder(makeApiOrder({ data_entrega: '10/07/2023' })).deliveredAt).toBe('2023-07-10')
  })

  it('converts data_alteracao to updatedAt', () => {
    expect(mapOrder(makeApiOrder({ data_alteracao: '15/01/2024' })).updatedAt).toBe('2024-01-15')
  })

  it('returns updatedAt=undefined when data_alteracao is absent', () => {
    expect(mapOrder(makeApiOrder({ data_alteracao: undefined })).updatedAt).toBeUndefined()
  })
})

// ── customer (nested cliente) ──────────────────────────────────────────────────

describe('mapOrder — customer from nested cliente', () => {
  const fullCliente = {
    nome: 'Maria Oliveira',
    codigo: 'CUST-01',
    nome_fantasia: 'MO Ltda',
    tipo_pessoa: 'J',
    cpf_cnpj: '12.345.678/0001-99',
    ie: 'IE-001',
    rg: '',
    endereco: 'Rua das Flores',
    numero: '100',
    complemento: 'Apto 2',
    bairro: 'Centro',
    cep: '01310-100',
    cidade: 'São Paulo',
    uf: 'SP',
    pais: 'Brasil',
    fone: '11999999999',
    email: 'maria@example.com',
  }

  it('maps all customer fields when cliente is present', () => {
    const result = mapOrder(makeApiOrder({ cliente: fullCliente }))
    expect(result.customer).toMatchObject({
      name: 'Maria Oliveira',
      code: 'CUST-01',
      tradeName: 'MO Ltda',
      personType: 'company',
      taxId: '12.345.678/0001-99',
      stateRegistration: 'IE-001',
      address: 'Rua das Flores',
      addressNumber: '100',
      addressComplement: 'Apto 2',
      neighborhood: 'Centro',
      zipCode: '01310-100',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      phone: '11999999999',
      email: 'maria@example.com',
    })
  })

  it('maps tipo_pessoa "F" to personType "individual"', () => {
    const result = mapOrder(makeApiOrder({ cliente: { ...fullCliente, tipo_pessoa: 'F' } }))
    expect(result.customer.personType).toBe('individual')
  })

  it('maps tipo_pessoa "E" to personType "foreign"', () => {
    const result = mapOrder(makeApiOrder({ cliente: { ...fullCliente, tipo_pessoa: 'E' } }))
    expect(result.customer.personType).toBe('foreign')
  })

  it('collapses empty string rg to undefined', () => {
    const result = mapOrder(makeApiOrder({ cliente: { ...fullCliente, rg: '' } }))
    expect(result.customer.rg).toBeUndefined()
  })

  it('maps rg when present', () => {
    const result = mapOrder(makeApiOrder({ cliente: { ...fullCliente, rg: '12.345.678-9' } }))
    expect(result.customer.rg).toBe('12.345.678-9')
  })
})

// ── customer (flat fallback) ───────────────────────────────────────────────────

describe('mapOrder — customer from flat fields (search fallback)', () => {
  it('uses nome as customer.name when cliente is absent', () => {
    const result = mapOrder(makeApiOrder({ cliente: undefined, nome: 'João Silva' }))
    expect(result.customer.name).toBe('João Silva')
  })

  it('uses id_contato as customer.code when cliente is absent', () => {
    const result = mapOrder(makeApiOrder({ cliente: undefined, id_contato: 'C042' }))
    expect(result.customer.code).toBe('C042')
  })

  it('returns customer.code=undefined when id_contato is empty', () => {
    const result = mapOrder(makeApiOrder({ cliente: undefined, id_contato: '' }))
    expect(result.customer.code).toBeUndefined()
  })
})

// ── deliveryAddress ────────────────────────────────────────────────────────────

describe('mapOrder — deliveryAddress', () => {
  const rawAddress = {
    tipo_pessoa: 'F',
    cpf_cnpj: '123.456.789-00',
    nome_destinatario: 'Ana Costa',
    endereco: 'Av. Paulista',
    numero: '1000',
    complemento: 'Sala 5',
    bairro: 'Bela Vista',
    cep: '01310-000',
    cidade: 'São Paulo',
    uf: 'SP',
    fone: '11888888888',
    ie: 'ISENTO',
  }

  it('maps all delivery address fields', () => {
    const result = mapOrder(makeApiOrder({ endereco_entrega: rawAddress }))
    expect(result.deliveryAddress).toMatchObject({
      personType: 'individual',
      taxId: '123.456.789-00',
      recipientName: 'Ana Costa',
      address: 'Av. Paulista',
      addressNumber: '1000',
      addressComplement: 'Sala 5',
      neighborhood: 'Bela Vista',
      zipCode: '01310-000',
      city: 'São Paulo',
      state: 'SP',
      phone: '11888888888',
      stateRegistration: 'ISENTO',
    })
  })

  it('returns deliveryAddress=undefined when endereco_entrega is absent', () => {
    expect(mapOrder(makeApiOrder({ endereco_entrega: undefined })).deliveryAddress).toBeUndefined()
  })
})

// ── total ──────────────────────────────────────────────────────────────────────

describe('mapOrder — total', () => {
  it('uses total_pedido when present', () => {
    expect(mapOrder(makeApiOrder({ total_pedido: '250.00', valor: '100.00' })).total).toBe(250)
  })

  it('falls back to valor when total_pedido is absent', () => {
    expect(mapOrder(makeApiOrder({ total_pedido: undefined, valor: '250.50' })).total).toBe(250.5)
  })

  it('parses valor with comma decimal separator', () => {
    expect(mapOrder(makeApiOrder({ valor: '250,50' })).total).toBe(250.5)
  })

  it('throws TinyMappingError when total is not numeric', () => {
    expect(() => mapOrder(makeApiOrder({ total_pedido: undefined, valor: 'abc' }))).toThrow(TinyMappingError)
  })

  it('includes field name in mapping error', () => {
    let err: TinyMappingError | undefined
    try {
      mapOrder(makeApiOrder({ valor: 'abc' }))
    } catch (e) {
      err = e as TinyMappingError
    }
    expect(err?.message).toContain('total_pedido')
  })
})

// ── financials ─────────────────────────────────────────────────────────────────

describe('mapOrder — financials', () => {
  it('maps valor_frete to freightAmount', () => {
    expect(mapOrder(makeApiOrder({ valor_frete: '15.00' })).freightAmount).toBe(15)
  })

  it('returns freightAmount=undefined when valor_frete is absent', () => {
    expect(mapOrder(makeApiOrder({ valor_frete: undefined })).freightAmount).toBeUndefined()
  })

  it('maps valor_desconto to discount', () => {
    expect(mapOrder(makeApiOrder({ valor_desconto: '10.00' })).discount).toBe(10)
  })

  it('maps outras_despesas to additionalExpenses', () => {
    expect(mapOrder(makeApiOrder({ outras_despesas: '5.00' })).additionalExpenses).toBe(5)
  })

  it('maps total_produtos to itemsTotal', () => {
    expect(mapOrder(makeApiOrder({ total_produtos: '100.00' })).itemsTotal).toBe(100)
  })
})

// ── payment ────────────────────────────────────────────────────────────────────

describe('mapOrder — payment', () => {
  it('maps condicao_pagamento to paymentTerms', () => {
    expect(mapOrder(makeApiOrder({ condicao_pagamento: '30/60/90' })).paymentTerms).toBe('30/60/90')
  })

  it('maps forma_pagamento to paymentMethod', () => {
    expect(mapOrder(makeApiOrder({ forma_pagamento: 'boleto' })).paymentMethod).toBe('boleto')
  })

  it('maps meio_pagamento to paymentMethodDescription', () => {
    expect(mapOrder(makeApiOrder({ meio_pagamento: 'Boleto Bancário' })).paymentMethodDescription).toBe('Boleto Bancário')
  })

  it('maps installments', () => {
    const raw = makeApiOrder({
      parcelas: [
        {
          parcela: {
            dias: 30,
            data: '15/04/2024',
            valor: '59.90',
            obs: 'Primeira parcela',
            forma_pagamento: 'boleto',
            meio_pagamento: 'Boleto',
          },
        },
      ],
    })
    const installment = mapOrder(raw).installments![0]
    expect(installment).toMatchObject({
      days: 30,
      dueDate: '2024-04-15',
      amount: 59.9,
      notes: 'Primeira parcela',
      paymentMethod: 'boleto',
      paymentMethodDescription: 'Boleto',
    })
  })

  it('returns installments=undefined when parcelas is absent', () => {
    expect(mapOrder(makeApiOrder({ parcelas: undefined })).installments).toBeUndefined()
  })

  it('maps integrated payments', () => {
    const raw = makeApiOrder({
      pagamentos_integrados: [
        {
          valor: 59.9,
          tipo_pagamento: 1,
          cnpj_intermediador: '12.345.678/0001-99',
          codigo_autorizacao: 'AUTH123',
          codigo_bandeira: 3,
        },
      ],
    })
    const payment = mapOrder(raw).integratedPayments![0]
    expect(payment).toMatchObject({
      amount: 59.9,
      paymentType: 1,
      intermediaryTaxId: '12.345.678/0001-99',
      authorizationCode: 'AUTH123',
      cardBrandCode: 3,
    })
  })

  it('returns integratedPayments=undefined when absent', () => {
    expect(mapOrder(makeApiOrder({ pagamentos_integrados: undefined })).integratedPayments).toBeUndefined()
  })
})

// ── shipping ───────────────────────────────────────────────────────────────────

describe('mapOrder — shipping', () => {
  it('maps nome_transportador to carrierName', () => {
    expect(mapOrder(makeApiOrder({ nome_transportador: 'Correios' })).carrierName).toBe('Correios')
  })

  it('maps frete_por_conta "C" to freightResponsibility "sender"', () => {
    expect(mapOrder(makeApiOrder({ frete_por_conta: 'C' })).freightResponsibility).toBe('sender')
  })

  it('maps frete_por_conta "D" to freightResponsibility "recipient"', () => {
    expect(mapOrder(makeApiOrder({ frete_por_conta: 'D' })).freightResponsibility).toBe('recipient')
  })

  it('maps frete_por_conta "3" to freightResponsibility "third-party"', () => {
    expect(mapOrder(makeApiOrder({ frete_por_conta: '3' })).freightResponsibility).toBe('third-party')
  })

  it('maps frete_por_conta "S" to freightResponsibility "no-freight"', () => {
    expect(mapOrder(makeApiOrder({ frete_por_conta: 'S' })).freightResponsibility).toBe('no-freight')
  })

  it('returns freightResponsibility=undefined when frete_por_conta is absent', () => {
    expect(mapOrder(makeApiOrder({ frete_por_conta: undefined })).freightResponsibility).toBeUndefined()
  })

  it('maps forma_frete to freightMethod', () => {
    expect(mapOrder(makeApiOrder({ forma_frete: 'PAC' })).freightMethod).toBe('PAC')
  })

  it('maps forma_envio to shippingMethod', () => {
    expect(mapOrder(makeApiOrder({ forma_envio: 'SEDEX' })).shippingMethod).toBe('SEDEX')
  })
})

// ── references ─────────────────────────────────────────────────────────────────

describe('mapOrder — references', () => {
  it('maps numero_ordem_compra to purchaseOrderNumber', () => {
    expect(mapOrder(makeApiOrder({ numero_ordem_compra: 'OC-001' })).purchaseOrderNumber).toBe('OC-001')
  })

  it('maps id_vendedor to sellerId as string', () => {
    expect(mapOrder(makeApiOrder({ id_vendedor: 7 })).sellerId).toBe('7')
  })

  it('returns sellerId=undefined when id_vendedor is absent', () => {
    expect(mapOrder(makeApiOrder({ id_vendedor: undefined })).sellerId).toBeUndefined()
  })

  it('maps nome_vendedor to sellerName', () => {
    expect(mapOrder(makeApiOrder({ nome_vendedor: 'Carlos' })).sellerName).toBe('Carlos')
  })

  it('maps id_nota_fiscal to invoiceId as string', () => {
    expect(mapOrder(makeApiOrder({ id_nota_fiscal: 42 })).invoiceId).toBe('42')
  })

  it('maps deposito to warehouse', () => {
    expect(mapOrder(makeApiOrder({ deposito: 'Depósito Central' })).warehouse).toBe('Depósito Central')
  })

  it('maps id_natureza_operacao to operationNatureId', () => {
    expect(mapOrder(makeApiOrder({ id_natureza_operacao: 'NOP-001' })).operationNatureId).toBe('NOP-001')
  })
})

// ── tracking ───────────────────────────────────────────────────────────────────

describe('mapOrder — tracking', () => {
  it('maps codigo_rastreamento to trackingCode', () => {
    expect(mapOrder(makeApiOrder({ codigo_rastreamento: 'BR123456789BR' })).trackingCode).toBe('BR123456789BR')
  })

  it('maps url_rastreamento to trackingUrl', () => {
    expect(mapOrder(makeApiOrder({ url_rastreamento: 'https://correios.com.br/track' })).trackingUrl).toBe('https://correios.com.br/track')
  })
})

// ── notes ──────────────────────────────────────────────────────────────────────

describe('mapOrder — notes', () => {
  it('maps obs to notes', () => {
    expect(mapOrder(makeApiOrder({ obs: 'Entrega rápida' })).notes).toBe('Entrega rápida')
  })

  it('maps obs_interna to internalNotes', () => {
    expect(mapOrder(makeApiOrder({ obs_interna: 'Prioridade alta' })).internalNotes).toBe('Prioridade alta')
  })
})

// ── e-commerce ─────────────────────────────────────────────────────────────────

describe('mapOrder — ecommerce', () => {
  it('maps ecommerce object', () => {
    const raw = makeApiOrder({
      ecommerce: {
        id: 3,
        numeroPedidoEcommerce: 'EC-0001',
        numeroPedidoCanalVenda: 'ML-0001',
        nomeEcommerce: 'Mercado Livre',
        canalVenda: 'ML Full',
      },
    })
    expect(mapOrder(raw).ecommerce).toMatchObject({
      id: 3,
      orderNumber: 'EC-0001',
      salesChannelOrderNumber: 'ML-0001',
      storeName: 'Mercado Livre',
      salesChannel: 'ML Full',
    })
  })

  it('returns ecommerce=undefined when absent', () => {
    expect(mapOrder(makeApiOrder({ ecommerce: undefined })).ecommerce).toBeUndefined()
  })
})

// ── intermediary ───────────────────────────────────────────────────────────────

describe('mapOrder — intermediary', () => {
  it('maps intermediador to intermediary', () => {
    const raw = makeApiOrder({
      intermediador: {
        nome: 'PagSeguro',
        cnpj: '08.561.701/0001-01',
        cnpjPagamento: '08.561.701/0001-02',
      },
    })
    expect(mapOrder(raw).intermediary).toMatchObject({
      name: 'PagSeguro',
      taxId: '08.561.701/0001-01',
      paymentTaxId: '08.561.701/0001-02',
    })
  })

  it('returns intermediary=undefined when absent', () => {
    expect(mapOrder(makeApiOrder({ intermediador: undefined })).intermediary).toBeUndefined()
  })
})

// ── markers ────────────────────────────────────────────────────────────────────

describe('mapOrder — markers', () => {
  it('maps marcadores to markers', () => {
    const raw = makeApiOrder({
      marcadores: [{ marcador: { id: 1, descricao: 'Urgente', cor: '#FF0000' } }],
    })
    expect(mapOrder(raw).markers![0]).toMatchObject({
      id: 1,
      description: 'Urgente',
      color: '#FF0000',
    })
  })

  it('returns markers=undefined when marcadores is absent', () => {
    expect(mapOrder(makeApiOrder({ marcadores: undefined })).markers).toBeUndefined()
  })
})

// ── items ──────────────────────────────────────────────────────────────────────

describe('mapOrder — items', () => {
  it('maps a single item correctly', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem()] }))
    expect(result.items[0]).toEqual({
      productId: '10',
      sku: undefined,
      productName: 'Camiseta Polo',
      unit: 'UN',
      quantity: 2,
      unitPrice: 59.9,
      totalPrice: 119.8,
      additionalInfo: undefined,
    })
  })

  it('maps item sku from codigo', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem({ codigo: 'SKU-01' })] }))
    expect(result.items[0].sku).toBe('SKU-01')
  })

  it('maps additionalInfo from info_adicional', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem({ info_adicional: 'Cor: Azul' })] }))
    expect(result.items[0].additionalInfo).toBe('Cor: Azul')
  })

  it('returns productId=undefined when id_produto is absent', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem({ id_produto: undefined })] }))
    expect(result.items[0].productId).toBeUndefined()
  })

  it('converts numeric id_produto to string', () => {
    const result = mapOrder(makeApiOrder({ itens: [makeApiItem({ id_produto: 99 })] }))
    expect(result.items[0].productId).toBe('99')
  })

  it('maps multiple items', () => {
    const itens = [
      makeApiItem({ id_produto: 1, descricao: 'Item A', quantidade: '1.00', valor_unitario: '10.00', valor: '10.00' }),
      makeApiItem({ id_produto: 2, descricao: 'Item B', quantidade: '3.00', valor_unitario: '20.00', valor: '60.00' }),
    ]
    const result = mapOrder(makeApiOrder({ itens }))
    expect(result.items).toHaveLength(2)
    expect(result.items[1].totalPrice).toBe(60)
  })

  it('returns empty items array when itens is absent', () => {
    expect(mapOrder(makeApiOrder({ itens: undefined })).items).toEqual([])
  })

  it('throws TinyMappingError when item quantidade is not numeric', () => {
    expect(() => mapOrder(makeApiOrder({ itens: [makeApiItem({ quantidade: 'abc' })] }))).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError when item valor_unitario is not numeric', () => {
    expect(() => mapOrder(makeApiOrder({ itens: [makeApiItem({ valor_unitario: 'xyz' })] }))).toThrow(TinyMappingError)
  })

  it('throws TinyMappingError when item valor is not numeric', () => {
    expect(() => mapOrder(makeApiOrder({ itens: [makeApiItem({ valor: '???' })] }))).toThrow(TinyMappingError)
  })
})

// ── full shape ─────────────────────────────────────────────────────────────────

describe('mapOrder — full shape', () => {
  it('maps a minimal order (flat fields fallback) correctly', () => {
    const result = mapOrder(makeApiOrder())
    expect(result.id).toBe('456')
    expect(result.number).toBe('000123')
    expect(result.status).toBe('open')
    expect(result.createdAt).toBe('2024-03-15')
    expect(result.customer.name).toBe('João Silva')
    expect(result.customer.code).toBe('C001')
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(119.8)
  })
})

// ── mapOrders ──────────────────────────────────────────────────────────────────

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
