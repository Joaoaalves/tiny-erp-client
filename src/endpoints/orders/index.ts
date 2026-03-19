import type {
  Order,
  SearchOrdersInput,
  SearchOrdersOutput,
} from '../../types/orders'

export interface OrdersModule {
  searchOrders(input: SearchOrdersInput): Promise<SearchOrdersOutput>
  getOrder(id: string): Promise<Order>
  createOrder(input: Omit<Order, 'id' | 'number' | 'createdAt' | 'updatedAt'>): Promise<Order>
  updateOrder(id: string, input: Partial<Omit<Order, 'id' | 'number' | 'createdAt'>>): Promise<Order>
}
