import type {
  Product,
  ProductClass,
  ProductKitItem,
  ProductMapping,
  ProductType,
  ProductVariation,
  ProductVariationMapping,
  ProductVariationType,
  PackagingType,
} from '../types/products'
import { TinyMappingError } from '../errors'

// ── Raw Tiny API types (Portuguese fields) ────────────────────────────────────

export interface ApiVariationMapping {
  idEcommerce: number
  skuMapeamento: string
  skuMapeamentoPai: string
  idMapeamentoPai: number
  idMapeamento: number
  preco?: string
  preco_promocional?: string
}

export interface ApiVariation {
  id: number | string
  codigo?: string
  preco?: string
  grade?: Record<string, string>
  mapeamentos?: Array<{ mapeamento: ApiVariationMapping }>
}

export interface ApiProductMapping {
  idEcommerce: number
  skuMapeamento: string
  idMapeamento: number
  preco?: string
  preco_promocional?: string
}

export interface ApiKitItem {
  id_produto: number | string
  quantidade: number | string
}

export interface ApiProduct {
  id: number | string
  nome: string
  codigo?: string
  data_criacao?: string
  unidade?: string
  preco?: string
  preco_promocional?: string
  preco_custo?: string
  preco_custo_medio?: string
  ncm?: string
  origem?: string
  gtin?: string
  gtin_embalagem?: string
  localizacao?: string
  peso_liquido?: string
  peso_bruto?: string
  estoque_minimo?: string
  estoque_maximo?: string
  id_fornecedor?: number | string
  codigo_fornecedor?: string
  codigo_pelo_fornecedor?: string
  unidade_por_caixa?: string
  situacao?: string
  tipo?: string
  classe_ipi?: string
  valor_ipi_fixo?: string
  cod_lista_servicos?: string
  descricao_complementar?: string
  /** Legacy field returned by search endpoints */
  descricao?: string
  obs?: string
  garantia?: string
  cest?: string
  tipoVariacao?: string
  variacoes?: Array<{ variacao: ApiVariation }>
  idProdutoPai?: number | string
  sob_encomenda?: string
  dias_preparacao?: number | string
  grade?: Record<string, string>
  marca?: string
  tipoEmbalagem?: number | string
  alturaEmbalagem?: string
  larguraEmbalagem?: string
  comprimentoEmbalagem?: string
  diametroEmbalagem?: string
  categoria?: string
  anexos?: Array<{ anexo: string }>
  imagens_externas?: Array<{ imagem_externa: { url: string } }>
  classe_produto?: string
  kit?: Array<{ item: ApiKitItem }>
  seo_title?: string
  seo_keywords?: string
  link_video?: string
  seo_description?: string
  slug?: string
  mapeamentos?: Array<{ mapeamento: ApiProductMapping }>
}

export interface ApiProductWrapper {
  produto: ApiProduct
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNumericField(value: string | number | undefined, field: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = parseFloat(String(value).replace(',', '.'))
  if (isNaN(parsed)) throw new TinyMappingError(field, { raw: value })
  return parsed
}

function presence(value: string | undefined): string | undefined {
  return value !== undefined && value !== '' ? value : undefined
}

/** Converts Tiny's DD/MM/AAAA HH:MM:SS to ISO 8601 (YYYY-MM-DDTHH:mm:ss) */
function parseTinyDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined
  // format: "DD/MM/AAAA HH:MM:SS"
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s(\d{2}:\d{2}:\d{2}))?$/.exec(value)
  if (!match) return undefined
  const [, day, month, year, time] = match
  return time ? `${year}-${month}-${day}T${time}` : `${year}-${month}-${day}`
}

function mapProductType(tipo: string | undefined): ProductType | undefined {
  if (tipo === 'P') return 'product'
  if (tipo === 'S') return 'service'
  return undefined
}

function mapVariationType(tipoVariacao: string | undefined): ProductVariationType | undefined {
  if (tipoVariacao === 'N') return 'normal'
  if (tipoVariacao === 'P') return 'parent'
  if (tipoVariacao === 'V') return 'variation'
  return undefined
}

function mapProductClass(classe: string | undefined): ProductClass | undefined {
  if (classe === 'S') return 'simple'
  if (classe === 'K') return 'kit'
  if (classe === 'V') return 'with-variations'
  if (classe === 'F') return 'manufactured'
  if (classe === 'M') return 'raw-material'
  return undefined
}

function mapPackagingType(tipo: number | string | undefined): PackagingType | undefined {
  const n = Number(tipo)
  if (n === 1) return 'envelope'
  if (n === 2) return 'box'
  if (n === 3) return 'cylinder'
  return undefined
}

function mapVariationMapping(raw: ApiVariationMapping): ProductVariationMapping {
  return {
    ecommerceId: raw.idEcommerce,
    sku: raw.skuMapeamento,
    parentSku: raw.skuMapeamentoPai,
    parentMappingId: raw.idMapeamentoPai,
    mappingId: raw.idMapeamento,
    price: parseNumericField(raw.preco, 'variacao.preco'),
    salePrice: parseNumericField(raw.preco_promocional, 'variacao.preco_promocional'),
  }
}

function mapVariation(raw: ApiVariation): ProductVariation {
  return {
    id: String(raw.id),
    sku: presence(raw.codigo),
    price: parseNumericField(raw.preco, 'variacao.preco'),
    attributes: raw.grade ?? {},
    mappings: raw.mapeamentos?.map(m => mapVariationMapping(m.mapeamento)),
  }
}

function mapProductMapping(raw: ApiProductMapping): ProductMapping {
  return {
    ecommerceId: raw.idEcommerce,
    sku: raw.skuMapeamento,
    mappingId: raw.idMapeamento,
    price: parseNumericField(raw.preco, 'mapeamento.preco'),
    salePrice: parseNumericField(raw.preco_promocional, 'mapeamento.preco_promocional'),
  }
}

function mapKitItem(raw: ApiKitItem): ProductKitItem {
  return {
    productId: String(raw.id_produto),
    quantity: Number(raw.quantidade),
  }
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function mapProduct(raw: ApiProduct): Product {
  return {
    // Identity
    id: String(raw.id),
    name: raw.nome,
    sku: presence(raw.codigo),
    createdAt: parseTinyDateTime(raw.data_criacao),

    // Status
    status: raw.situacao === 'I' ? 'inactive' : 'active',
    type: mapProductType(raw.tipo),

    // Pricing
    price: parseNumericField(raw.preco, 'preco'),
    salePrice: parseNumericField(raw.preco_promocional, 'preco_promocional'),
    costPrice: parseNumericField(raw.preco_custo, 'preco_custo'),
    averageCostPrice: parseNumericField(raw.preco_custo_medio, 'preco_custo_medio'),

    // Fiscal
    ncm: presence(raw.ncm),
    origin: presence(raw.origem),
    gtin: presence(raw.gtin),
    gtinPackaging: presence(raw.gtin_embalagem),
    ipiClass: presence(raw.classe_ipi),
    fixedIpiValue: parseNumericField(raw.valor_ipi_fixo, 'valor_ipi_fixo'),
    serviceListCode: presence(raw.cod_lista_servicos),
    cest: presence(raw.cest),

    // Physical
    unit: presence(raw.unidade),
    unitsPerBox: presence(raw.unidade_por_caixa),
    netWeight: parseNumericField(raw.peso_liquido, 'peso_liquido'),
    grossWeight: parseNumericField(raw.peso_bruto, 'peso_bruto'),

    // Packaging dimensions
    packagingType: mapPackagingType(raw.tipoEmbalagem),
    packagingHeight: parseNumericField(raw.alturaEmbalagem, 'alturaEmbalagem'),
    packagingWidth: parseNumericField(raw.larguraEmbalagem, 'larguraEmbalagem'),
    packagingLength: parseNumericField(raw.comprimentoEmbalagem, 'comprimentoEmbalagem'),
    packagingDiameter: parseNumericField(raw.diametroEmbalagem, 'diametroEmbalagem'),

    // Stock
    minStock: parseNumericField(raw.estoque_minimo, 'estoque_minimo'),
    maxStock: parseNumericField(raw.estoque_maximo, 'estoque_maximo'),

    // Supplier
    supplierId: raw.id_fornecedor !== undefined ? String(raw.id_fornecedor) : undefined,
    supplierCode: presence(raw.codigo_fornecedor),
    supplierProductCode: presence(raw.codigo_pelo_fornecedor),

    // Classification
    class: mapProductClass(raw.classe_produto),
    brand: presence(raw.marca),
    category: presence(raw.categoria),
    location: presence(raw.localizacao),

    // Variations
    variationType: mapVariationType(raw.tipoVariacao),
    parentProductId: raw.idProdutoPai !== undefined ? String(raw.idProdutoPai) : undefined,
    attributes: raw.grade,
    variations: raw.variacoes?.map(v => mapVariation(v.variacao)),

    // Kit
    kitItems: raw.kit?.map(k => mapKitItem(k.item)),

    // Fulfillment
    madeToOrder: raw.sob_encomenda === 'S' ? true : raw.sob_encomenda === 'N' ? false : undefined,
    preparationDays:
      raw.dias_preparacao !== undefined ? Number(raw.dias_preparacao) : undefined,

    // Content
    description: presence(raw.descricao_complementar) ?? presence(raw.descricao),
    notes: presence(raw.obs),
    warranty: presence(raw.garantia),
    attachments: raw.anexos?.map(a => a.anexo),
    externalImages: raw.imagens_externas?.map(i => i.imagem_externa.url),

    // SEO / e-commerce
    seoTitle: presence(raw.seo_title),
    seoKeywords: presence(raw.seo_keywords),
    seoDescription: presence(raw.seo_description),
    videoLink: presence(raw.link_video),
    slug: presence(raw.slug),

    // E-commerce mappings
    mappings: raw.mapeamentos?.map(m => mapProductMapping(m.mapeamento)),
  }
}

export function mapProducts(wrappers: ApiProductWrapper[]): Product[] {
  return wrappers.map(w => mapProduct(w.produto))
}
