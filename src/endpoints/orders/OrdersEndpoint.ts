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

/** Converts an OrderItem (EN) to Tiny's item body (PT) */
function toApiItem(item: OrderItem): Record<string, unknown> {
  return {
    item: {
      descricao: item.productName,
      quantidade: String(item.quantity),
      valor_unitario: String(item.unitPrice),
    },
  }
}

/** Converts order fields (EN) to Tiny API body fields (PT) */
function toApiBody(
  input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (input.status !== undefined) body.situacao = REVERSE_STATUS_MAP[input.status]
  if (input.customerName !== undefined) body.nome = input.customerName !== '' ? input.customerName : undefined
  if (input.customerId !== undefined) body.id_contato = input.customerId !== '' ? input.customerId : undefined
  if (input.items !== undefined) body.itens = input.items.map(toApiItem)

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
      body: { pedido: toApiBody(input) },
    })

    assertOk(raw.retorno.status, 'createOrder')

    const id = String(raw.retorno.registros![0].registro.id)
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
      body: { pedido: { id, ...toApiBody(input) } },
    })

    assertOk(raw.retorno.status, 'updateOrder')

    return this.getOrder(id)
  }
}
