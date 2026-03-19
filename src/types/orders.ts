export type OrderStatus =
  | 'open'
  | 'approved'
  | 'cancelled'
  | 'invoiced'
  | 'shipped'
  | 'delivered'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  total: number
  customerId?: string
  customerName?: string
}

export interface SearchOrdersInput {
  status?: OrderStatus
  page?: number
  startDate?: string
  endDate?: string
}

export interface SearchOrdersOutput {
  orders: Order[]
  total: number
  page: number
}
