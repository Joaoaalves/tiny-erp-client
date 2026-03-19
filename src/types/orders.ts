// ── Enums / Literals ─────────────────────────────────────────────────────────

export type OrderStatus =
  | 'open'
  | 'approved'
  | 'cancelled'
  | 'invoiced'
  | 'shipped'
  | 'delivered'

/** F = individual, J = company, E = foreign */
export type PersonType = 'individual' | 'company' | 'foreign'

/** C = sender, D = recipient, 3 = third-party, S = no-freight */
export type FreightResponsibility = 'sender' | 'recipient' | 'third-party' | 'no-freight'

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface OrderCustomer {
  code?: string
  name: string
  tradeName?: string
  personType?: PersonType
  /** CPF (individual) or CNPJ (company) */
  taxId?: string
  stateRegistration?: string
  rg?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  zipCode?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
}

export interface OrderDeliveryAddress {
  personType?: PersonType
  taxId?: string
  recipientName?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  zipCode?: string
  city?: string
  state?: string
  phone?: string
  stateRegistration?: string
}

export interface OrderItem {
  productId?: string
  sku?: string
  productName: string
  unit?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  additionalInfo?: string
}

export interface OrderInstallment {
  days?: number
  /** ISO date YYYY-MM-DD */
  dueDate?: string
  amount: number
  notes?: string
  paymentMethod: string
  paymentMethodDescription?: string
}

export interface OrderMarker {
  id: number
  description: string
  /** Hex color, e.g. "#FF0000" */
  color?: string
}

export interface OrderEcommerce {
  id?: number
  orderNumber?: string
  salesChannelOrderNumber?: string
  storeName?: string
  salesChannel?: string
}

export interface OrderIntermediary {
  name: string
  /** CNPJ */
  taxId: string
  paymentTaxId?: string
}

export interface OrderIntegratedPayment {
  amount: number
  /** Payment type code per NFe table */
  paymentType: number
  intermediaryTaxId: string
  authorizationCode: string
  /** Card brand/operator code */
  cardBrandCode: number
}

// ── Core type ─────────────────────────────────────────────────────────────────

export interface Order {
  // ── Identity
  id: string
  /** Internal Tiny order number */
  number: string
  /** E-commerce platform order number */
  ecommerceNumber?: string

  // ── Status
  status: OrderStatus

  // ── Dates (ISO YYYY-MM-DD)
  createdAt: string
  estimatedAt?: string
  invoicedAt?: string
  shippedAt?: string
  deliveredAt?: string
  updatedAt?: string

  // ── Parties
  customer: OrderCustomer
  deliveryAddress?: OrderDeliveryAddress

  // ── Items
  items: OrderItem[]

  // ── Payment
  paymentTerms?: string
  paymentMethod?: string
  paymentMethodDescription?: string
  installments?: OrderInstallment[]
  integratedPayments?: OrderIntegratedPayment[]

  // ── Shipping
  carrierName?: string
  freightResponsibility?: FreightResponsibility
  freightMethod?: string
  shippingMethod?: string

  // ── Financials
  freightAmount?: number
  discount?: number
  additionalExpenses?: number
  itemsTotal?: number
  total: number

  // ── References
  purchaseOrderNumber?: string
  sellerId?: string
  sellerName?: string
  invoiceId?: string
  warehouse?: string
  operationNatureId?: string

  // ── Tracking
  trackingCode?: string
  trackingUrl?: string

  // ── Notes
  notes?: string
  internalNotes?: string

  // ── E-commerce
  ecommerce?: OrderEcommerce
  intermediary?: OrderIntermediary
  markers?: OrderMarker[]
}

// ── Endpoint I/O ─────────────────────────────────────────────────────────────

export interface SearchOrdersInput {
  status?: OrderStatus
  page?: number
  startDate?: string
  endDate?: string
}

export interface SearchOrdersOutput {
  orders: Order[]
  page: number
  numberOfPages: number
}
