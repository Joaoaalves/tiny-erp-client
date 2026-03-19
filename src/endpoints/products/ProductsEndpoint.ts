import type { Product, SearchProductsInput, SearchProductsOutput } from '../../types/products'
import type { ProductsModule } from './index'
import type { RequestExecutor } from '../../client/RequestExecutor'
import { mapProduct, mapProducts } from '../../mappers/product.mapper'
import { TinyApiError } from '../../errors'
import type {
  ApiSearchProductsResponse,
  ApiGetProductResponse,
  ApiCreateProductResponse,
  ApiStatusResponse,
  ApiGetStockResponse,
  ApiGetStructureResponse,
  ApiGetStockUpdatesResponse,
} from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertOk(status: string, operation: string): void {
  if (status !== 'OK') {
    throw new TinyApiError(`Tiny API error [${operation}]: ${status}`, 'TINY_STATUS_ERROR')
  }
}

/** Converts ISO YYYY-MM-DD to Tiny's DD/MM/YYYY format */
function toTinyDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/** Converts a Product (English) to Tiny API body fields (Portuguese) */
function toApiBody(input: Partial<Omit<Product, 'id'>>): Record<string, string | undefined> {
  return {
    nome: input.name,
    codigo: input.sku,
    preco: input.price !== undefined ? String(input.price) : undefined,
    unidade: input.unit,
    peso_bruto: input.weight !== undefined ? String(input.weight) : undefined,
    descricao: input.description,
    situacao: input.active !== undefined ? (input.active ? 'A' : 'I') : undefined,
  }
}

// ── Implementation ────────────────────────────────────────────────────────────

export class ProductsEndpoint implements ProductsModule {
  constructor(private readonly executor: RequestExecutor) {}

  // 1. searchProducts ──────────────────────────────────────────────────────────

  async searchProducts(input: SearchProductsInput): Promise<SearchProductsOutput> {
    const params: Record<string, string> = {}
    if (input.query !== undefined) params.pesquisa = input.query
    if (input.page !== undefined) params.pagina = String(input.page)

    const raw = await this.executor.execute<ApiSearchProductsResponse>({
      path: '/produtos.pesquisar',
      method: 'GET',
      params,
    })

    assertOk(raw.retorno.status, 'searchProducts')

    return {
      products: mapProducts(raw.retorno.produtos ?? []),
      page: raw.retorno.pagina,
      numberOfPages: raw.retorno.numero_paginas,
    }
  }

  // 2. getProduct ──────────────────────────────────────────────────────────────

  async getProduct(id: string): Promise<Product> {
    const raw = await this.executor.execute<ApiGetProductResponse>({
      path: '/produto.obter',
      method: 'GET',
      params: { id },
    })

    assertOk(raw.retorno.status, 'getProduct')

    return mapProduct(raw.retorno.produto)
  }

  // 3. createProduct ───────────────────────────────────────────────────────────

  async createProduct(input: Omit<Product, 'id'>): Promise<Product> {
    const raw = await this.executor.execute<ApiCreateProductResponse>({
      path: '/produto.incluir',
      method: 'POST',
      body: { produto: toApiBody(input) },
    })

    assertOk(raw.retorno.status, 'createProduct')

    const id = String(raw.retorno.registros![0].registro.id)
    return this.getProduct(id)
  }

  // 4. updateProduct ───────────────────────────────────────────────────────────

  async updateProduct(id: string, input: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const raw = await this.executor.execute<ApiStatusResponse>({
      path: '/produto.alterar',
      method: 'POST',
      body: { produto: { id, ...toApiBody(input) } },
    })

    assertOk(raw.retorno.status, 'updateProduct')

    return this.getProduct(id)
  }

  // 5. getStock ────────────────────────────────────────────────────────────────

  async getStock(id: string): Promise<{ productId: string; quantity: number }> {
    const raw = await this.executor.execute<ApiGetStockResponse>({
      path: '/produto.obter.estoque',
      method: 'GET',
      params: { id },
    })

    assertOk(raw.retorno.status, 'getStock')

    const quantity = raw.retorno.produto.saldo.reduce((sum, entry) => sum + entry.saldo.saldo, 0)

    return { productId: String(raw.retorno.produto.id), quantity }
  }

  // 6. getStructure ────────────────────────────────────────────────────────────

  async getStructure(id: string): Promise<unknown> {
    const raw = await this.executor.execute<ApiGetStructureResponse>({
      path: '/produto.obter.estrutura',
      method: 'GET',
      params: { id },
    })

    assertOk(raw.retorno.status, 'getStructure')

    return raw.retorno.produto.estrutura
  }

  // 7. getChangedProducts ──────────────────────────────────────────────────────

  async getChangedProducts(since: string): Promise<Product[]> {
    const raw = await this.executor.execute<ApiSearchProductsResponse>({
      path: '/produtos.pesquisar',
      method: 'GET',
      params: { dataAlteracao: toTinyDate(since) },
    })

    assertOk(raw.retorno.status, 'getChangedProducts')

    return mapProducts(raw.retorno.produtos ?? [])
  }

  // 8. getStockUpdates ─────────────────────────────────────────────────────────

  async getStockUpdates(since: string): Promise<Array<{ productId: string; quantity: number }>> {
    const raw = await this.executor.execute<ApiGetStockUpdatesResponse>({
      path: '/produto.atualizacoes.estoque',
      method: 'GET',
      params: { dataAlteracao: toTinyDate(since) },
    })

    assertOk(raw.retorno.status, 'getStockUpdates')

    return (raw.retorno.atualizacoes ?? []).map(entry => ({
      productId: String(entry.atualizacao.id),
      quantity: entry.atualizacao.quantidade,
    }))
  }

  // 9. updateStock ─────────────────────────────────────────────────────────────

  async updateStock(id: string, quantity: number): Promise<void> {
    const raw = await this.executor.execute<ApiStatusResponse>({
      path: '/produto.atualizar.estoque',
      method: 'POST',
      body: { produto: { id, quantidade: String(quantity) } },
    })

    assertOk(raw.retorno.status, 'updateStock')
  }

  // 10. updatePrices ───────────────────────────────────────────────────────────

  async updatePrices(id: string, price: number): Promise<void> {
    const raw = await this.executor.execute<ApiStatusResponse>({
      path: '/produto.atualizar.precos',
      method: 'POST',
      body: { produto: { id, preco: String(price) } },
    })

    assertOk(raw.retorno.status, 'updatePrices')
  }
}
