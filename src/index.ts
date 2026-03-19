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
  ProductType,
  ProductStatus,
  ProductClass,
  ProductVariationType,
  PackagingType,
  ProductVariation,
  ProductVariationMapping,
  ProductMapping,
  ProductKitItem,
  SearchProductsInput,
  SearchProductsOutput,
} from './types/products'

// Orders
export type {
  Order,
  OrderStatus,
  PersonType,
  FreightResponsibility,
  OrderCustomer,
  OrderDeliveryAddress,
  OrderItem,
  OrderInstallment,
  OrderMarker,
  OrderEcommerce,
  OrderIntermediary,
  OrderIntegratedPayment,
  SearchOrdersInput,
  SearchOrdersOutput,
} from './types/orders'
