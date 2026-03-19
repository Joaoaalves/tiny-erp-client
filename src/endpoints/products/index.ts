import type {
  Product,
  SearchProductsInput,
  SearchProductsOutput,
} from '../../types/products'

export interface ProductsModule {
  searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput>
  getProduct(id: string): Promise<Product>
  createProduct(input: Omit<Product, 'id'>): Promise<Product>
  updateProduct(id: string, input: Partial<Omit<Product, 'id'>>): Promise<Product>
  getStock(id: string): Promise<{ productId: string; quantity: number }>
  getStructure(id: string): Promise<unknown>
  getChangedProducts(since: string): Promise<Product[]>
  getStockUpdates(since: string): Promise<Array<{ productId: string; quantity: number }>>
  updateStock(id: string, quantity: number): Promise<void>
  updatePrices(id: string, price: number): Promise<void>
}
