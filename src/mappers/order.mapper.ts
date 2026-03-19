import type { Order, OrderItem, OrderStatus } from '../types/orders'
import { TinyMappingError } from '../errors'

// ── Raw Tiny API types (Portuguese fields) ───────────────────────────────────

export interface ApiOrderItem {
  item: {
    id: number | string
    codigo?: string
    descricao: string
    quantidade: string
    valor_unitario: string
    valor: string
  }
}

export interface ApiOrder {
  id: number | string
  numero: string
  situacao: string
  data_pedido: string
  data_alteracao?: string
  nome?: string
  id_contato?: string
  valor: string
  itens?: ApiOrderItem[]
}

export interface ApiOrderWrapper {
  pedido: ApiOrder
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Tiny uses DD/MM/YYYY — convert to YYYY-MM-DD for ISO consistency
export function parseTinyDate(raw: string): string {
  const parts = raw.split('/')
  if (parts.length !== 3 || parts.some(p => p === '')) {
    throw new TinyMappingError('data', { raw })
  }
  const [day, month, year] = parts
  return `${year}-${month}-${day}`
}

function parseRequired(value: string, field: string): number {
  const parsed = parseFloat(value.replace(',', '.'))
  if (isNaN(parsed)) throw new TinyMappingError(field, { raw: value })
  return parsed
}

// ── Status mapping ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, OrderStatus> = {
  'Em aberto': 'open',
  Aprovado: 'approved',
  'Preparando envio': 'approved',
  Faturado: 'invoiced',
  'Pronto para envio': 'shipped',
  Enviado: 'shipped',
  Entregue: 'delivered',
  'Não entregue': 'cancelled',
  Cancelado: 'cancelled',
  'Cancelado pelo marketplace': 'cancelled',
}

function mapOrderStatus(situacao: string): OrderStatus {
  const status = STATUS_MAP[situacao]
  if (status === undefined) throw new TinyMappingError('situacao', { raw: situacao })
  return status
}

// ── Item mapper ───────────────────────────────────────────────────────────────

function mapOrderItem(wrapper: ApiOrderItem): OrderItem {
  const { item } = wrapper
  return {
    productId: String(item.id),
    productName: item.descricao,
    quantity: parseRequired(item.quantidade, 'quantidade'),
    unitPrice: parseRequired(item.valor_unitario, 'valor_unitario'),
    totalPrice: parseRequired(item.valor, 'valor'),
  }
}

// ── Order mapper ──────────────────────────────────────────────────────────────

export function mapOrder(raw: ApiOrder): Order {
  const createdAt = parseTinyDate(raw.data_pedido)
  const updatedAt = raw.data_alteracao ? parseTinyDate(raw.data_alteracao) : createdAt

  return {
    id: String(raw.id),
    number: raw.numero,
    status: mapOrderStatus(raw.situacao),
    createdAt,
    updatedAt,
    items: (raw.itens ?? []).map(mapOrderItem),
    total: parseRequired(raw.valor, 'valor'),
    customerId: raw.id_contato !== undefined && raw.id_contato !== '' ? raw.id_contato : undefined,
    customerName: raw.nome !== undefined && raw.nome !== '' ? raw.nome : undefined,
  }
}

export function mapOrders(wrappers: ApiOrderWrapper[]): Order[] {
  return wrappers.map(w => mapOrder(w.pedido))
}
