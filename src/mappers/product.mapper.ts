import type { Product } from '../types/products'
import { TinyMappingError } from '../errors'

// ── Raw Tiny API types (Portuguese fields) ───────────────────────────────────

export interface ApiProduct {
  id: number | string
  nome: string
  codigo?: string
  preco?: string
  unidade?: string
  peso_bruto?: string
  descricao?: string
  situacao?: string
}

export interface ApiProductWrapper {
  produto: ApiProduct
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseNumericField(value: string | undefined, field: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = parseFloat(value.replace(',', '.'))
  if (isNaN(parsed)) throw new TinyMappingError(field, { raw: value })
  return parsed
}

function presence(value: string | undefined): string | undefined {
  return value !== undefined && value !== '' ? value : undefined
}

// ── Mapper ───────────────────────────────────────────────────────────────────

export function mapProduct(raw: ApiProduct): Product {
  return {
    id: String(raw.id),
    name: raw.nome,
    description: presence(raw.descricao),
    sku: presence(raw.codigo),
    price: parseNumericField(raw.preco, 'preco'),
    weight: parseNumericField(raw.peso_bruto, 'peso_bruto'),
    unit: presence(raw.unidade),
    active: raw.situacao === 'A',
  }
}

export function mapProducts(wrappers: ApiProductWrapper[]): Product[] {
  return wrappers.map(w => mapProduct(w.produto))
}
