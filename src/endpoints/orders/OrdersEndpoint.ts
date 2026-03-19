import type { Order, OrderItem, OrderStatus, SearchOrdersInput, SearchOrdersOutput } from '../../types/orders'
import type { OrdersModule } from './index'
import type { RequestExecutor } from '../../client/RequestExecutor'
import { mapOrder, mapOrders } from '../../mappers/order.mapper'
import { TinyApiError } from '../../errors'
import type {
  ApiSearchOrdersResponse,
  ApiGetOrderResponse,
  ApiCreateOrderResponse,
  ApiStatusResponse,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertOk(status: string, operation: string): void {
  if (status !== 'OK') {
    throw new TinyApiError(`Tiny API error [${operation}]: ${status}`, 'TINY_STATUS_ERROR')
  }
}

/** Tiny returns registros as { registro } when there is one record, or [{ registro }] for many. */
function firstRegistro<T>(registros: Array<{ registro: T }> | { registro: T }): T {
  return Array.isArray(registros) ? registros[0].registro : registros.registro
}

/** Converts ISO YYYY-MM-DD to Tiny's DD/MM/YYYY format */
function toTinyDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/** Maps our normalized OrderStatus back to Tiny's situacao string */
const REVERSE_STATUS_MAP: Record<OrderStatus, string> = {
  open: 'Em aberto',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
  invoiced: 'Faturado',
  shipped: 'Enviado',
  delivered: 'Entregue',
}

const PERSON_TYPE_MAP = {
  individual: 'F',
  company: 'J',
  foreign: 'E',
} as const

const FREIGHT_RESPONSIBILITY_MAP = {
  sender: 'C',
  recipient: 'D',
  'third-party': '3',
  'no-freight': 'S',
} as const

/** Converts an OrderItem (EN) to Tiny's item body (PT) */
function toApiItem(item: OrderItem): Record<string, unknown> {
  return {
    item: {
      id_produto: item.productId,
      codigo: item.sku,
      descricao: item.productName,
      unidade: item.unit,
      quantidade: String(item.quantity),
      valor_unitario: String(item.unitPrice),
      info_adicional: item.additionalInfo,
    },
  }
}

/** Converts order fields (EN) to Tiny API body fields (PT) */
function toApiBody(
  input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (input.status !== undefined) body.situacao = REVERSE_STATUS_MAP[input.status]
  if (input.ecommerceNumber !== undefined) body.numero_ecommerce = input.ecommerceNumber

  if (input.customer !== undefined) {
    body.cliente = {
      nome: input.customer.name,
      codigo: input.customer.code,
      nome_fantasia: input.customer.tradeName,
      tipo_pessoa:
        input.customer.personType !== undefined
          ? PERSON_TYPE_MAP[input.customer.personType]
          : undefined,
      cpf_cnpj: input.customer.taxId,
      ie: input.customer.stateRegistration,
      rg: input.customer.rg,
      endereco: input.customer.address,
      numero: input.customer.addressNumber,
      complemento: input.customer.addressComplement,
      bairro: input.customer.neighborhood,
      cep: input.customer.zipCode,
      cidade: input.customer.city,
      uf: input.customer.state,
      pais: input.customer.country,
      fone: input.customer.phone,
      email: input.customer.email,
    }
  }

  if (input.items !== undefined) body.itens = input.items.map(toApiItem)

  if (input.paymentTerms !== undefined) body.condicao_pagamento = input.paymentTerms
  if (input.paymentMethod !== undefined) body.forma_pagamento = input.paymentMethod

  if (input.carrierName !== undefined) body.nome_transportador = input.carrierName
  if (input.freightResponsibility !== undefined)
    body.frete_por_conta = FREIGHT_RESPONSIBILITY_MAP[input.freightResponsibility]
  if (input.freightMethod !== undefined) body.forma_frete = input.freightMethod
  if (input.shippingMethod !== undefined) body.forma_envio = input.shippingMethod

  if (input.freightAmount !== undefined) body.valor_frete = String(input.freightAmount)
  if (input.discount !== undefined) body.valor_desconto = String(input.discount)
  if (input.additionalExpenses !== undefined) body.outras_despesas = String(input.additionalExpenses)

  if (input.purchaseOrderNumber !== undefined) body.numero_ordem_compra = input.purchaseOrderNumber
  if (input.operationNatureId !== undefined) body.id_natureza_operacao = input.operationNatureId

  if (input.trackingCode !== undefined) body.codigo_rastreamento = input.trackingCode
  if (input.trackingUrl !== undefined) body.url_rastreamento = input.trackingUrl

  if (input.notes !== undefined) body.obs = input.notes
  if (input.internalNotes !== undefined) body.obs_interna = input.internalNotes

  return body
}

// ── Implementation ────────────────────────────────────────────────────────────

export class OrdersEndpoint implements OrdersModule {
  constructor(private readonly executor: RequestExecutor) {}

  // 1. searchOrders ────────────────────────────────────────────────────────────

  async searchOrders(input: SearchOrdersInput): Promise<SearchOrdersOutput> {
    const params: Record<string, string> = {}
    if (input.status !== undefined) params.situacao = REVERSE_STATUS_MAP[input.status]
    if (input.page !== undefined) params.pagina = String(input.page)
    if (input.startDate !== undefined) params.dataInicial = toTinyDate(input.startDate)
    if (input.endDate !== undefined) params.dataFinal = toTinyDate(input.endDate)

    const raw = await this.executor.execute<ApiSearchOrdersResponse>({
      path: '/pedidos.pesquisar',
      method: 'GET',
      params,
    })

    assertOk(raw.retorno.status, 'searchOrders')

    return {
      orders: mapOrders(raw.retorno.pedidos ?? []),
      page: raw.retorno.pagina,
      numberOfPages: raw.retorno.numero_paginas,
    }
  }

  // 2. getOrder ────────────────────────────────────────────────────────────────

  async getOrder(id: string): Promise<Order> {
    const raw = await this.executor.execute<ApiGetOrderResponse>({
      path: '/pedido.obter',
      method: 'GET',
      params: { id },
    })

    assertOk(raw.retorno.status, 'getOrder')

    return mapOrder(raw.retorno.pedido)
  }

  // 3. createOrder ─────────────────────────────────────────────────────────────

  async createOrder(
    input: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'>,
  ): Promise<Order> {
    const raw = await this.executor.execute<ApiCreateOrderResponse>({
      path: '/pedido.incluir',
      method: 'POST',
      queryBody: { pedido: { pedido: toApiBody(input) } },
    })

    assertOk(raw.retorno.status, 'createOrder')

    const id = String(firstRegistro(raw.retorno.registros!).id)
    return this.getOrder(id)
  }

  // 4. updateOrder ─────────────────────────────────────────────────────────────

  async updateOrder(
    id: string,
    input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>,
  ): Promise<Order> {
    const raw = await this.executor.execute<ApiStatusResponse>({
      path: '/pedido.alterar',
      method: 'POST',
      queryBody: { pedido: { pedido: { id, ...toApiBody(input) } } },
    })

    assertOk(raw.retorno.status, 'updateOrder')

    return this.getOrder(id)
  }
}
