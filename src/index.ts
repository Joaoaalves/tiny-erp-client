// Client
export { TinyClient } from './client/TinyClient'
export type { TinyClientConfig, TinyPlan } from './types/client'

// HTTP layer (for custom implementations)
export type { HttpClient, HttpRequest, HttpResponse } from './types/http'
export type { RateLimiter } from './types/rate-limit'

// Errors
export { TinyApiError, TinyRateLimitError, TinyTransportError, TinyMappingError } from './errors'

// Products
export type {
  Product,
  SearchProductsInput,
  SearchProductsOutput,
} from './types/products'

// Orders
export type {
  Order,
  OrderItem,
  OrderStatus,
  SearchOrdersInput,
  SearchOrdersOutput,
} from './types/orders'
