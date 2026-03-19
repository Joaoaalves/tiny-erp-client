import type { TinyClientConfig } from '../types/client'
import { ProductsEndpoint } from '../endpoints/products'
import { OrdersEndpoint } from '../endpoints/orders'
import { FetchHttpClient } from '../core/FetchHttpClient'
import { createRateLimiter } from '../rate-limit/createRateLimiter'
import { RequestExecutor } from './RequestExecutor'

export class TinyClient {
  readonly products: ProductsEndpoint
  readonly orders: OrdersEndpoint

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
    this.orders = new OrdersEndpoint(this.executor)
  }
}
