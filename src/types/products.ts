export interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  price?: number
  weight?: number
  unit?: string
  active: boolean
}

export interface SearchProductsInput {
  query?: string
  page?: number
}

export interface SearchProductsOutput {
  products: Product[]
  total: number
  page: number
}
