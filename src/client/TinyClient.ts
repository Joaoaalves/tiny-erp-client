import type { TinyClientConfig } from '../types/client'
import type { OrdersModule } from '../endpoints/orders'
import { ProductsEndpoint } from '../endpoints/products'
import { FetchHttpClient } from '../core/FetchHttpClient'
import { createRateLimiter } from '../rate-limit/createRateLimiter'
import { RequestExecutor } from './RequestExecutor'

export class TinyClient {
  readonly products: ProductsEndpoint
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

    this.products = new ProductsEndpoint(this.executor)
    // Orders module connected in feature/orders-endpoint
    this.orders = {} as OrdersModule
  }
}
