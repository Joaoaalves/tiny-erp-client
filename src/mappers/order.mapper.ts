import type {
  Order,
  OrderCustomer,
  OrderDeliveryAddress,
  OrderEcommerce,
  OrderInstallment,
  OrderIntegratedPayment,
  OrderIntermediary,
  OrderItem,
  OrderMarker,
  OrderStatus,
  PersonType,
  FreightResponsibility,
} from '../types/orders'
import { TinyMappingError } from '../errors'

// ── Raw Tiny API types (Portuguese fields) ────────────────────────────────────

export interface ApiOrderCustomer {
  codigo?: string
  nome: string
  nome_fantasia?: string
  tipo_pessoa?: string
  cpf_cnpj?: string
  ie?: string
  rg?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  pais?: string
  fone?: string
  email?: string
}

export interface ApiOrderDeliveryAddress {
  tipo_pessoa?: string
  cpf_cnpj?: string
  nome_destinatario?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  fone?: string
  ie?: string
}

export interface ApiOrderItem {
  item: {
    id_produto?: number | string
    codigo?: string
    descricao: string
    unidade?: string
    quantidade: string
    valor_unitario: string
    valor: string
    info_adicional?: string
  }
}

export interface ApiOrderInstallment {
  parcela: {
    dias?: number
    data?: string
    valor: string
    obs?: string
    forma_pagamento: string
    meio_pagamento?: string
  }
}

export interface ApiOrderMarker {
  marcador: {
    id: number
    descricao: string
    cor?: string
  }
}

export interface ApiOrderEcommerce {
  id?: number
  numeroPedidoEcommerce?: string
  numeroPedidoCanalVenda?: string
  nomeEcommerce?: string
  canalVenda?: string
}

export interface ApiOrderIntermediary {
  nome: string
  cnpj: string
  cnpjPagamento?: string
}

export interface ApiIntegratedPayment {
  valor: number | string
  tipo_pagamento: number
  cnpj_intermediador: string
  codigo_autorizacao: string
  codigo_bandeira: number
}

export interface ApiOrder {
  id: number | string
  numero: string | number
  numero_ecommerce?: string
  data_pedido: string
  data_prevista?: string
  data_faturamento?: string
  data_envio?: string
  data_entrega?: string
  /** Present in search results */
  data_alteracao?: string
  /** Nested customer object (from obter endpoint) */
  cliente?: ApiOrderCustomer
  /** Legacy flat customer name (from search endpoint) */
  nome?: string
  /** Legacy flat customer id (from search endpoint) */
  id_contato?: string
  endereco_entrega?: ApiOrderDeliveryAddress
  itens?: ApiOrderItem[]
  condicao_pagamento?: string
  forma_pagamento?: string
  meio_pagamento?: string
  parcelas?: ApiOrderInstallment[]
  marcadores?: ApiOrderMarker[]
  nome_transportador?: string
  frete_por_conta?: string
  forma_frete?: string
  valor_frete?: string
  valor_desconto?: string
  outras_despesas?: string
  total_produtos?: string
  /** total_pedido from obter endpoint */
  total_pedido?: string
  /** valor from search endpoint */
  valor?: string
  situacao: string
  numero_ordem_compra?: string
  id_vendedor?: number | string
  nome_vendedor?: string
  obs?: string
  obs_interna?: string
  codigo_rastreamento?: string
  url_rastreamento?: string
  id_nota_fiscal?: number | string
  deposito?: string
  ecommerce?: ApiOrderEcommerce
  forma_envio?: string
  intermediador?: ApiOrderIntermediary
  id_natureza_operacao?: string
  pagamentos_integrados?: ApiIntegratedPayment[]
}

export interface ApiOrderWrapper {
  pedido: ApiOrder
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts Tiny's DD/MM/YYYY to ISO YYYY-MM-DD */
export function parseTinyDate(raw: string): string {
  const parts = raw.split('/')
  if (parts.length !== 3 || parts.some(p => p === '')) {
    throw new TinyMappingError('data', { raw })
  }
  const [day, month, year] = parts
  return `${year}-${month}-${day}`
}

function parseTinyDateOpt(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return parseTinyDate(raw)
}

function parseNumeric(value: string | number | undefined, field: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = parseFloat(String(value).replace(',', '.'))
  if (isNaN(parsed)) throw new TinyMappingError(field, { raw: value })
  return parsed
}

function parseRequired(value: string, field: string): number {
  const parsed = parseFloat(value.replace(',', '.'))
  if (isNaN(parsed)) throw new TinyMappingError(field, { raw: value })
  return parsed
}

function presence(value: string | undefined): string | undefined {
  return value !== undefined && value !== '' ? value : undefined
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

// ── Person type mapping ───────────────────────────────────────────────────────

function mapPersonType(tipo: string | undefined): PersonType | undefined {
  if (tipo === 'F') return 'individual'
  if (tipo === 'J') return 'company'
  if (tipo === 'E') return 'foreign'
  return undefined
}

// ── Freight responsibility mapping ────────────────────────────────────────────

const FREIGHT_MAP: Record<string, FreightResponsibility> = {
  C: 'sender',
  D: 'recipient',
  '3': 'third-party',
  S: 'no-freight',
}

function mapFreightResponsibility(code: string | undefined): FreightResponsibility | undefined {
  if (!code) return undefined
  return FREIGHT_MAP[code] ?? undefined
}

// ── Sub-mappers ───────────────────────────────────────────────────────────────

function mapCustomer(raw: ApiOrder): OrderCustomer {
  if (raw.cliente) {
    const c = raw.cliente
    return {
      code: presence(c.codigo),
      name: c.nome,
      tradeName: presence(c.nome_fantasia),
      personType: mapPersonType(c.tipo_pessoa),
      taxId: presence(c.cpf_cnpj),
      stateRegistration: presence(c.ie),
      rg: presence(c.rg),
      address: presence(c.endereco),
      addressNumber: presence(c.numero),
      addressComplement: presence(c.complemento),
      neighborhood: presence(c.bairro),
      zipCode: presence(c.cep),
      city: presence(c.cidade),
      state: presence(c.uf),
      country: presence(c.pais),
      phone: presence(c.fone),
      email: presence(c.email),
    }
  }
  // Fallback: flat fields from search endpoint
  return {
    name: raw.nome ?? '',
    code: presence(raw.id_contato),
  }
}

function mapDeliveryAddress(raw: ApiOrderDeliveryAddress): OrderDeliveryAddress {
  return {
    personType: mapPersonType(raw.tipo_pessoa),
    taxId: presence(raw.cpf_cnpj),
    recipientName: presence(raw.nome_destinatario),
    address: presence(raw.endereco),
    addressNumber: presence(raw.numero),
    addressComplement: presence(raw.complemento),
    neighborhood: presence(raw.bairro),
    zipCode: presence(raw.cep),
    city: presence(raw.cidade),
    state: presence(raw.uf),
    phone: presence(raw.fone),
    stateRegistration: presence(raw.ie),
  }
}

function mapOrderItem(wrapper: ApiOrderItem): OrderItem {
  const { item } = wrapper
  return {
    productId: item.id_produto !== undefined ? String(item.id_produto) : undefined,
    sku: presence(item.codigo),
    productName: item.descricao,
    unit: presence(item.unidade),
    quantity: parseRequired(item.quantidade, 'quantidade'),
    unitPrice: parseRequired(item.valor_unitario, 'valor_unitario'),
    totalPrice: parseRequired(item.valor, 'valor'),
    additionalInfo: presence(item.info_adicional),
  }
}

function mapInstallment(wrapper: ApiOrderInstallment): OrderInstallment {
  const { parcela } = wrapper
  return {
    days: parcela.dias,
    dueDate: parseTinyDateOpt(parcela.data),
    amount: parseRequired(parcela.valor, 'parcela.valor'),
    notes: presence(parcela.obs),
    paymentMethod: parcela.forma_pagamento,
    paymentMethodDescription: presence(parcela.meio_pagamento),
  }
}

function mapMarker(wrapper: ApiOrderMarker): OrderMarker {
  const { marcador } = wrapper
  return {
    id: marcador.id,
    description: marcador.descricao,
    color: presence(marcador.cor),
  }
}

function mapEcommerce(raw: ApiOrderEcommerce): OrderEcommerce {
  return {
    id: raw.id,
    orderNumber: presence(raw.numeroPedidoEcommerce),
    salesChannelOrderNumber: presence(raw.numeroPedidoCanalVenda),
    storeName: presence(raw.nomeEcommerce),
    salesChannel: presence(raw.canalVenda),
  }
}

function mapIntermediary(raw: ApiOrderIntermediary): OrderIntermediary {
  return {
    name: raw.nome,
    taxId: raw.cnpj,
    paymentTaxId: presence(raw.cnpjPagamento),
  }
}

function mapIntegratedPayment(raw: ApiIntegratedPayment): OrderIntegratedPayment {
  return {
    amount: parseRequired(String(raw.valor), 'pagamento.valor'),
    paymentType: raw.tipo_pagamento,
    intermediaryTaxId: raw.cnpj_intermediador,
    authorizationCode: raw.codigo_autorizacao,
    cardBrandCode: raw.codigo_bandeira,
  }
}

// ── Order mapper ──────────────────────────────────────────────────────────────

export function mapOrder(raw: ApiOrder): Order {
  const totalRaw = raw.total_pedido ?? raw.valor ?? '0'

  return {
    // Identity
    id: String(raw.id),
    number: String(raw.numero),
    ecommerceNumber: presence(raw.numero_ecommerce),

    // Status
    status: mapOrderStatus(raw.situacao),

    // Dates
    createdAt: parseTinyDate(raw.data_pedido),
    estimatedAt: parseTinyDateOpt(raw.data_prevista),
    invoicedAt: parseTinyDateOpt(raw.data_faturamento),
    shippedAt: parseTinyDateOpt(raw.data_envio),
    deliveredAt: parseTinyDateOpt(raw.data_entrega),
    updatedAt: parseTinyDateOpt(raw.data_alteracao),

    // Parties
    customer: mapCustomer(raw),
    deliveryAddress: raw.endereco_entrega ? mapDeliveryAddress(raw.endereco_entrega) : undefined,

    // Items
    items: (raw.itens ?? []).map(mapOrderItem),

    // Payment
    paymentTerms: presence(raw.condicao_pagamento),
    paymentMethod: presence(raw.forma_pagamento),
    paymentMethodDescription: presence(raw.meio_pagamento),
    installments: raw.parcelas?.map(mapInstallment),
    integratedPayments: raw.pagamentos_integrados?.map(mapIntegratedPayment),

    // Shipping
    carrierName: presence(raw.nome_transportador),
    freightResponsibility: mapFreightResponsibility(raw.frete_por_conta),
    freightMethod: presence(raw.forma_frete),
    shippingMethod: presence(raw.forma_envio),

    // Financials
    freightAmount: parseNumeric(raw.valor_frete, 'valor_frete'),
    discount: parseNumeric(raw.valor_desconto, 'valor_desconto'),
    additionalExpenses: parseNumeric(raw.outras_despesas, 'outras_despesas'),
    itemsTotal: parseNumeric(raw.total_produtos, 'total_produtos'),
    total: parseRequired(totalRaw, 'total_pedido'),

    // References
    purchaseOrderNumber: presence(raw.numero_ordem_compra),
    sellerId: raw.id_vendedor !== undefined ? String(raw.id_vendedor) : undefined,
    sellerName: presence(raw.nome_vendedor),
    invoiceId: raw.id_nota_fiscal !== undefined ? String(raw.id_nota_fiscal) : undefined,
    warehouse: presence(raw.deposito),
    operationNatureId: presence(raw.id_natureza_operacao),

    // Tracking
    trackingCode: presence(raw.codigo_rastreamento),
    trackingUrl: presence(raw.url_rastreamento),

    // Notes
    notes: presence(raw.obs),
    internalNotes: presence(raw.obs_interna),

    // E-commerce
    ecommerce: raw.ecommerce ? mapEcommerce(raw.ecommerce) : undefined,
    intermediary: raw.intermediador ? mapIntermediary(raw.intermediador) : undefined,
    markers: raw.marcadores?.map(mapMarker),
  }
}

export function mapOrders(wrappers: ApiOrderWrapper[]): Order[] {
  return wrappers.map(w => mapOrder(w.pedido))
}
