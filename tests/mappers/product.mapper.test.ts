import { describe, it, expect } from 'vitest'
import { mapProduct, mapProducts } from '../../src/mappers/product.mapper'
import type { ApiProduct, ApiProductWrapper } from '../../src/mappers/product.mapper'
import { TinyMappingError } from '../../src/errors'

function makeApiProduct(overrides: Partial<ApiProduct> = {}): ApiProduct {
  return {
    id: 123,
    nome: 'Camiseta Polo',
    codigo: 'CAM001',
    preco: '59.90',
    unidade: 'UN',
    peso_bruto: '0.300',
    descricao: 'Camiseta polo masculina',
    situacao: 'A',
    ...overrides,
  }
}

describe('mapProduct', () => {
  // ── id ───────────────────────────────────────────────────────────────────

  it('converts numeric id to string', () => {
    const result = mapProduct(makeApiProduct({ id: 9876 }))
    expect(result.id).toBe('9876')
  })

  it('accepts string id and keeps it as-is', () => {
    const result = mapProduct(makeApiProduct({ id: '9876' }))
    expect(result.id).toBe('9876')
  })

  // ── name ─────────────────────────────────────────────────────────────────

  it('maps nome to name', () => {
    const result = mapProduct(makeApiProduct({ nome: 'Calça Jeans' }))
    expect(result.name).toBe('Calça Jeans')
  })

  // ── active (situacao) ─────────────────────────────────────────────────────

  it('sets active=true when situacao is "A"', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'A' })).active).toBe(true)
  })

  it('sets active=false when situacao is "I" (inactive)', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'I' })).active).toBe(false)
  })

  it('sets active=false when situacao is "E" (deleted)', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'E' })).active).toBe(false)
  })

  it('sets active=false when situacao is undefined', () => {
    expect(mapProduct(makeApiProduct({ situacao: undefined })).active).toBe(false)
  })

  // ── sku (codigo) ──────────────────────────────────────────────────────────

  it('maps codigo to sku', () => {
    expect(mapProduct(makeApiProduct({ codigo: 'SKU-999' })).sku).toBe('SKU-999')
  })

  it('returns sku=undefined when codigo is empty string', () => {
    expect(mapProduct(makeApiProduct({ codigo: '' })).sku).toBeUndefined()
  })

  it('returns sku=undefined when codigo is absent', () => {
    expect(mapProduct(makeApiProduct({ codigo: undefined })).sku).toBeUndefined()
  })

  // ── description (descricao) ───────────────────────────────────────────────

  it('maps descricao to description', () => {
    expect(mapProduct(makeApiProduct({ descricao: 'Produto top' })).description).toBe('Produto top')
  })

  it('returns description=undefined when descricao is empty string', () => {
    expect(mapProduct(makeApiProduct({ descricao: '' })).description).toBeUndefined()
  })

  it('returns description=undefined when descricao is absent', () => {
    expect(mapProduct(makeApiProduct({ descricao: undefined })).description).toBeUndefined()
  })

  // ── unit (unidade) ────────────────────────────────────────────────────────

  it('maps unidade to unit', () => {
    expect(mapProduct(makeApiProduct({ unidade: 'KG' })).unit).toBe('KG')
  })

  it('returns unit=undefined when unidade is empty string', () => {
    expect(mapProduct(makeApiProduct({ unidade: '' })).unit).toBeUndefined()
  })

  it('returns unit=undefined when unidade is absent', () => {
    expect(mapProduct(makeApiProduct({ unidade: undefined })).unit).toBeUndefined()
  })

  // ── price (preco) ─────────────────────────────────────────────────────────

  it('maps preco to price as a float', () => {
    expect(mapProduct(makeApiProduct({ preco: '59.90' })).price).toBe(59.9)
  })

  it('maps preco with comma decimal separator', () => {
    expect(mapProduct(makeApiProduct({ preco: '59,90' })).price).toBe(59.9)
  })

  it('maps preco=0 to price=0', () => {
    expect(mapProduct(makeApiProduct({ preco: '0.00' })).price).toBe(0)
  })

  it('returns price=undefined when preco is empty string', () => {
    expect(mapProduct(makeApiProduct({ preco: '' })).price).toBeUndefined()
  })

  it('returns price=undefined when preco is absent', () => {
    expect(mapProduct(makeApiProduct({ preco: undefined })).price).toBeUndefined()
  })

  it('throws TinyMappingError when preco is not numeric', () => {
    expect(() => mapProduct(makeApiProduct({ preco: 'abc' }))).toThrow(TinyMappingError)
  })

  it('includes field name "preco" in the mapping error', () => {
    const err = (() => {
      try {
        mapProduct(makeApiProduct({ preco: 'abc' }))
      } catch (e) {
        return e as TinyMappingError
      }
    })()!
    expect(err.message).toContain('preco')
  })

  // ── weight (peso_bruto) ───────────────────────────────────────────────────

  it('maps peso_bruto to weight as a float', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '1.500' })).weight).toBe(1.5)
  })

  it('maps peso_bruto with comma decimal separator', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '1,500' })).weight).toBe(1.5)
  })

  it('maps peso_bruto=0 to weight=0', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '0.000' })).weight).toBe(0)
  })

  it('returns weight=undefined when peso_bruto is empty string', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '' })).weight).toBeUndefined()
  })

  it('returns weight=undefined when peso_bruto is absent', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: undefined })).weight).toBeUndefined()
  })

  it('throws TinyMappingError when peso_bruto is not numeric', () => {
    expect(() => mapProduct(makeApiProduct({ peso_bruto: 'xyz' }))).toThrow(TinyMappingError)
  })

  it('includes field name "peso_bruto" in the mapping error', () => {
    const err = (() => {
      try {
        mapProduct(makeApiProduct({ peso_bruto: 'xyz' }))
      } catch (e) {
        return e as TinyMappingError
      }
    })()!
    expect(err.message).toContain('peso_bruto')
  })

  // ── full product shape ────────────────────────────────────────────────────

  it('maps a fully populated product correctly', () => {
    const result = mapProduct(makeApiProduct())
    expect(result).toEqual({
      id: '123',
      name: 'Camiseta Polo',
      description: 'Camiseta polo masculina',
      sku: 'CAM001',
      price: 59.9,
      weight: 0.3,
      unit: 'UN',
      active: true,
    })
  })

  it('maps a minimal product (only required fields) correctly', () => {
    const result = mapProduct({ id: 1, nome: 'Produto Simples' })
    expect(result).toEqual({
      id: '1',
      name: 'Produto Simples',
      description: undefined,
      sku: undefined,
      price: undefined,
      weight: undefined,
      unit: undefined,
      active: false,
    })
  })
})

describe('mapProducts', () => {
  it('maps an array of product wrappers', () => {
    const wrappers: ApiProductWrapper[] = [
      { produto: makeApiProduct({ id: 1, nome: 'Produto A' }) },
      { produto: makeApiProduct({ id: 2, nome: 'Produto B', situacao: 'I' }) },
    ]
    const result = mapProducts(wrappers)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Produto A')
    expect(result[1].name).toBe('Produto B')
    expect(result[1].active).toBe(false)
  })

  it('returns an empty array for an empty input', () => {
    expect(mapProducts([])).toEqual([])
  })
})
