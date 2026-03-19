// ── Enums / Literals ─────────────────────────────────────────────────────────

/** P = product, S = service */
export type ProductType = 'product' | 'service'

/** A = active, I = inactive */
export type ProductStatus = 'active' | 'inactive'

/** N = normal, P = parent, V = variation */
export type ProductVariationType = 'normal' | 'parent' | 'variation'

/** S = simple, K = kit, V = with-variations, F = manufactured, M = raw-material */
export type ProductClass = 'simple' | 'kit' | 'with-variations' | 'manufactured' | 'raw-material'

/** 1 = envelope, 2 = box, 3 = cylinder */
export type PackagingType = 'envelope' | 'box' | 'cylinder'

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface ProductVariationMapping {
  ecommerceId: number
  sku: string
  parentSku: string
  parentMappingId: number
  mappingId: number
  price?: number
  salePrice?: number
}

export interface ProductVariation {
  id: string
  sku?: string
  price?: number
  /** Dynamic attribute key-value pairs, e.g. { Tamanho: 'GG', Cor: 'Branco' } */
  attributes: Record<string, string>
  mappings?: ProductVariationMapping[]
}

export interface ProductMapping {
  ecommerceId: number
  sku: string
  mappingId: number
  price?: number
  salePrice?: number
}

export interface ProductKitItem {
  productId: string
  quantity: number
}

// ── Core type ─────────────────────────────────────────────────────────────────

export interface Product {
  // ── Identity
  id: string
  name: string
  sku?: string
  createdAt?: string

  // ── Status
  status: ProductStatus
  type?: ProductType

  // ── Pricing
  price?: number
  salePrice?: number
  costPrice?: number
  averageCostPrice?: number

  // ── Fiscal
  ncm?: string
  /** Origin code (0–8 per ICMS rules) */
  origin?: string
  gtin?: string
  gtinPackaging?: string
  ipiClass?: string
  fixedIpiValue?: number
  serviceListCode?: string
  cest?: string

  // ── Physical
  unit?: string
  unitsPerBox?: string
  netWeight?: number
  grossWeight?: number

  // ── Packaging dimensions (cm)
  packagingType?: PackagingType
  packagingHeight?: number
  packagingWidth?: number
  packagingLength?: number
  packagingDiameter?: number

  // ── Stock
  minStock?: number
  maxStock?: number

  // ── Supplier
  supplierId?: string
  supplierCode?: string
  supplierProductCode?: string

  // ── Classification
  class?: ProductClass
  brand?: string
  category?: string
  location?: string

  // ── Variations
  variationType?: ProductVariationType
  parentProductId?: string
  /** Attribute grid (e.g. { Tamanho: ['P','M','G'] }) */
  attributes?: Record<string, string>
  variations?: ProductVariation[]

  // ── Kit
  kitItems?: ProductKitItem[]

  // ── Fulfillment
  madeToOrder?: boolean
  preparationDays?: number

  // ── Content
  description?: string
  notes?: string
  warranty?: string
  attachments?: string[]
  externalImages?: string[]

  // ── SEO / e-commerce
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  videoLink?: string
  slug?: string

  // ── E-commerce mappings
  mappings?: ProductMapping[]
}

// ── Endpoint I/O ─────────────────────────────────────────────────────────────

export interface SearchProductsInput {
  query?: string
  page?: number
}

export interface SearchProductsOutput {
  products: Product[]
  page: number
  numberOfPages: number
}
