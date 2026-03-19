import type { TinyClientConfig } from '../types/client'
import type { ProductsModule } from '../endpoints/products'
import type { OrdersModule } from '../endpoints/orders'

export class TinyClient {
  readonly products: ProductsModule
  readonly orders: OrdersModule

  constructor(_config: TinyClientConfig) {
    // Modules will be initialized in subsequent feature branches
    this.products = {} as ProductsModule
    this.orders = {} as OrdersModule
  }
}
