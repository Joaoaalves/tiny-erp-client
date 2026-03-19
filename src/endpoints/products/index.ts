import type {
  Product,
  ProductStock,
  ProductStructure,
  SearchProductsInput,
  SearchProductsOutput,
  StockUpdate,
  UpdateStockInput,
  UpdateStockResult,
} from '../../types/products'

export interface ProductsModule {
  searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput>
  getProduct(id: string): Promise<Product>
  createProduct(input: Omit<Product, 'id'>): Promise<Product>
  updateProduct(id: string, input: Partial<Omit<Product, 'id'>>): Promise<Product>
  getStock(id: string): Promise<ProductStock>
  getStructure(id: string): Promise<ProductStructure>
  getChangedProducts(since: string): Promise<Product[]>
  getStockUpdates(since: string): Promise<StockUpdate[]>
  updateStock(input: UpdateStockInput): Promise<UpdateStockResult>
  updatePrices(id: string, price: number): Promise<void>
}

export { ProductsEndpoint } from './ProductsEndpoint'
