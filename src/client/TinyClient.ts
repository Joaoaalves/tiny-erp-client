import type { TinyClientConfig } from '../types/client'
import type { ProductsModule } from '../endpoints/products'
import type { OrdersModule } from '../endpoints/orders'
import { FetchHttpClient } from '../core/FetchHttpClient'
import { createRateLimiter } from '../rate-limit/createRateLimiter'
import { RequestExecutor } from './RequestExecutor'

export class TinyClient {
  readonly products: ProductsModule
  readonly orders: OrdersModule

  /**
   * Internal request executor shared by all endpoint modules.
   * @internal
   */
  readonly executor: RequestExecutor

  constructor(config: TinyClientConfig) {
    const httpClient = config.httpClient ?? new FetchHttpClient()
    const rateLimiter = createRateLimiter(config.plan)

    this.executor = new RequestExecutor(config.token, httpClient, rateLimiter)

    // Module implementations are connected in feature/products and feature/orders
    this.products = {} as ProductsModule
    this.orders = {} as OrdersModule
  }
}
