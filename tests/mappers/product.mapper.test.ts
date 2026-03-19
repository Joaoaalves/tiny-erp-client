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
    descricao_complementar: 'Camiseta polo masculina',
    situacao: 'A',
    ...overrides,
  }
}

describe('mapProduct', () => {
  // ── id ─────────────────────────────────────────────────────────────────────

  it('converts numeric id to string', () => {
    expect(mapProduct(makeApiProduct({ id: 9876 })).id).toBe('9876')
  })

  it('accepts string id and keeps it as-is', () => {
    expect(mapProduct(makeApiProduct({ id: '9876' })).id).toBe('9876')
  })

  // ── name ───────────────────────────────────────────────────────────────────

  it('maps nome to name', () => {
    expect(mapProduct(makeApiProduct({ nome: 'Calça Jeans' })).name).toBe('Calça Jeans')
  })

  // ── status (situacao) ──────────────────────────────────────────────────────

  it('sets status="active" when situacao is "A"', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'A' })).status).toBe('active')
  })

  it('sets status="inactive" when situacao is "I"', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'I' })).status).toBe('inactive')
  })

  it('sets status="active" as default when situacao is undefined', () => {
    expect(mapProduct(makeApiProduct({ situacao: undefined })).status).toBe('active')
  })

  it('sets status="active" for unknown situacao values', () => {
    expect(mapProduct(makeApiProduct({ situacao: 'X' })).status).toBe('active')
  })

  // ── type (tipo) ────────────────────────────────────────────────────────────

  it('maps tipo "P" to type "product"', () => {
    expect(mapProduct(makeApiProduct({ tipo: 'P' })).type).toBe('product')
  })

  it('maps tipo "S" to type "service"', () => {
    expect(mapProduct(makeApiProduct({ tipo: 'S' })).type).toBe('service')
  })

  it('returns type=undefined when tipo is absent', () => {
    expect(mapProduct(makeApiProduct({ tipo: undefined })).type).toBeUndefined()
  })

  // ── sku (codigo) ───────────────────────────────────────────────────────────

  it('maps codigo to sku', () => {
    expect(mapProduct(makeApiProduct({ codigo: 'SKU-999' })).sku).toBe('SKU-999')
  })

  it('returns sku=undefined when codigo is empty string', () => {
    expect(mapProduct(makeApiProduct({ codigo: '' })).sku).toBeUndefined()
  })

  it('returns sku=undefined when codigo is absent', () => {
    expect(mapProduct(makeApiProduct({ codigo: undefined })).sku).toBeUndefined()
  })

  // ── createdAt (data_criacao) ───────────────────────────────────────────────

  it('converts data_criacao DD/MM/AAAA HH:MM:SS to ISO', () => {
    const result = mapProduct(makeApiProduct({ data_criacao: '15/03/2024 10:30:00' }))
    expect(result.createdAt).toBe('2024-03-15T10:30:00')
  })

  it('converts data_criacao DD/MM/AAAA without time to ISO date', () => {
    const result = mapProduct(makeApiProduct({ data_criacao: '01/01/2023' }))
    expect(result.createdAt).toBe('2023-01-01')
  })

  it('returns createdAt=undefined when data_criacao is absent', () => {
    expect(mapProduct(makeApiProduct({ data_criacao: undefined })).createdAt).toBeUndefined()
  })

  // ── description (descricao_complementar / descricao fallback) ─────────────

  it('maps descricao_complementar to description', () => {
    expect(
      mapProduct(makeApiProduct({ descricao_complementar: 'Complementar' })).description,
    ).toBe('Complementar')
  })

  it('falls back to descricao when descricao_complementar is absent', () => {
    expect(
      mapProduct(makeApiProduct({ descricao_complementar: undefined, descricao: 'Legado' })).description,
    ).toBe('Legado')
  })

  it('descricao_complementar takes priority over descricao', () => {
    expect(
      mapProduct(makeApiProduct({ descricao_complementar: 'Principal', descricao: 'Legado' })).description,
    ).toBe('Principal')
  })

  it('returns description=undefined when both fields are absent', () => {
    expect(
      mapProduct(makeApiProduct({ descricao_complementar: undefined, descricao: undefined })).description,
    ).toBeUndefined()
  })

  // ── price (preco) ──────────────────────────────────────────────────────────

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
    let err: TinyMappingError | undefined
    try {
      mapProduct(makeApiProduct({ preco: 'abc' }))
    } catch (e) {
      err = e as TinyMappingError
    }
    expect(err!.message).toContain('preco')
  })

  // ── salePrice (preco_promocional) ─────────────────────────────────────────

  it('maps preco_promocional to salePrice', () => {
    expect(mapProduct(makeApiProduct({ preco_promocional: '49.90' })).salePrice).toBe(49.9)
  })

  it('returns salePrice=undefined when preco_promocional is absent', () => {
    expect(mapProduct(makeApiProduct({ preco_promocional: undefined })).salePrice).toBeUndefined()
  })

  // ── costPrice (preco_custo) ────────────────────────────────────────────────

  it('maps preco_custo to costPrice', () => {
    expect(mapProduct(makeApiProduct({ preco_custo: '30.00' })).costPrice).toBe(30)
  })

  // ── averageCostPrice (preco_custo_medio) ───────────────────────────────────

  it('maps preco_custo_medio to averageCostPrice', () => {
    expect(mapProduct(makeApiProduct({ preco_custo_medio: '32.50' })).averageCostPrice).toBe(32.5)
  })

  // ── fiscal fields ──────────────────────────────────────────────────────────

  it('maps ncm', () => {
    expect(mapProduct(makeApiProduct({ ncm: '6109.10.00' })).ncm).toBe('6109.10.00')
  })

  it('maps origem to origin', () => {
    expect(mapProduct(makeApiProduct({ origem: '0' })).origin).toBe('0')
  })

  it('maps gtin', () => {
    expect(mapProduct(makeApiProduct({ gtin: '7891234560001' })).gtin).toBe('7891234560001')
  })

  it('maps gtin_embalagem to gtinPackaging', () => {
    expect(mapProduct(makeApiProduct({ gtin_embalagem: '7891234560002' })).gtinPackaging).toBe('7891234560002')
  })

  it('maps classe_ipi to ipiClass', () => {
    expect(mapProduct(makeApiProduct({ classe_ipi: '049' })).ipiClass).toBe('049')
  })

  it('maps valor_ipi_fixo to fixedIpiValue', () => {
    expect(mapProduct(makeApiProduct({ valor_ipi_fixo: '5.00' })).fixedIpiValue).toBe(5)
  })

  it('maps cod_lista_servicos to serviceListCode', () => {
    expect(mapProduct(makeApiProduct({ cod_lista_servicos: '01.01' })).serviceListCode).toBe('01.01')
  })

  it('maps cest', () => {
    expect(mapProduct(makeApiProduct({ cest: '28.038.00' })).cest).toBe('28.038.00')
  })

  // ── physical / weight ──────────────────────────────────────────────────────

  it('maps peso_bruto to grossWeight as a float', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '1.500' })).grossWeight).toBe(1.5)
  })

  it('maps peso_bruto with comma decimal separator', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '1,500' })).grossWeight).toBe(1.5)
  })

  it('maps peso_bruto=0 to grossWeight=0', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '0.000' })).grossWeight).toBe(0)
  })

  it('returns grossWeight=undefined when peso_bruto is empty string', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: '' })).grossWeight).toBeUndefined()
  })

  it('returns grossWeight=undefined when peso_bruto is absent', () => {
    expect(mapProduct(makeApiProduct({ peso_bruto: undefined })).grossWeight).toBeUndefined()
  })

  it('throws TinyMappingError when peso_bruto is not numeric', () => {
    expect(() => mapProduct(makeApiProduct({ peso_bruto: 'xyz' }))).toThrow(TinyMappingError)
  })

  it('includes field name "peso_bruto" in the mapping error', () => {
    let err: TinyMappingError | undefined
    try {
      mapProduct(makeApiProduct({ peso_bruto: 'xyz' }))
    } catch (e) {
      err = e as TinyMappingError
    }
    expect(err!.message).toContain('peso_bruto')
  })

  it('maps peso_liquido to netWeight', () => {
    expect(mapProduct(makeApiProduct({ peso_liquido: '0.250' })).netWeight).toBe(0.25)
  })

  it('returns netWeight=undefined when peso_liquido is absent', () => {
    expect(mapProduct(makeApiProduct({ peso_liquido: undefined })).netWeight).toBeUndefined()
  })

  // ── unit ──────────────────────────────────────────────────────────────────

  it('maps unidade to unit', () => {
    expect(mapProduct(makeApiProduct({ unidade: 'KG' })).unit).toBe('KG')
  })

  it('returns unit=undefined when unidade is empty string', () => {
    expect(mapProduct(makeApiProduct({ unidade: '' })).unit).toBeUndefined()
  })

  it('maps unidade_por_caixa to unitsPerBox', () => {
    expect(mapProduct(makeApiProduct({ unidade_por_caixa: '12' })).unitsPerBox).toBe('12')
  })

  // ── stock ─────────────────────────────────────────────────────────────────

  it('maps estoque_minimo to minStock', () => {
    expect(mapProduct(makeApiProduct({ estoque_minimo: '5' })).minStock).toBe(5)
  })

  it('maps estoque_maximo to maxStock', () => {
    expect(mapProduct(makeApiProduct({ estoque_maximo: '100' })).maxStock).toBe(100)
  })

  // ── supplier ──────────────────────────────────────────────────────────────

  it('maps id_fornecedor to supplierId as string', () => {
    expect(mapProduct(makeApiProduct({ id_fornecedor: 42 })).supplierId).toBe('42')
  })

  it('returns supplierId=undefined when id_fornecedor is absent', () => {
    expect(mapProduct(makeApiProduct({ id_fornecedor: undefined })).supplierId).toBeUndefined()
  })

  it('maps codigo_fornecedor to supplierCode', () => {
    expect(mapProduct(makeApiProduct({ codigo_fornecedor: 'FORN01' })).supplierCode).toBe('FORN01')
  })

  it('maps codigo_pelo_fornecedor to supplierProductCode', () => {
    expect(mapProduct(makeApiProduct({ codigo_pelo_fornecedor: 'REF-XYZ' })).supplierProductCode).toBe('REF-XYZ')
  })

  // ── classification ────────────────────────────────────────────────────────

  it('maps marca to brand', () => {
    expect(mapProduct(makeApiProduct({ marca: 'Nike' })).brand).toBe('Nike')
  })

  it('maps categoria to category', () => {
    expect(mapProduct(makeApiProduct({ categoria: 'Roupas >> Camisetas' })).category).toBe('Roupas >> Camisetas')
  })

  it('maps localizacao to location', () => {
    expect(mapProduct(makeApiProduct({ localizacao: 'Prateleira A1' })).location).toBe('Prateleira A1')
  })

  // ── productClass (classe_produto) ─────────────────────────────────────────

  it('maps classe_produto "S" to class "simple"', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: 'S' })).class).toBe('simple')
  })

  it('maps classe_produto "K" to class "kit"', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: 'K' })).class).toBe('kit')
  })

  it('maps classe_produto "V" to class "with-variations"', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: 'V' })).class).toBe('with-variations')
  })

  it('maps classe_produto "F" to class "manufactured"', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: 'F' })).class).toBe('manufactured')
  })

  it('maps classe_produto "M" to class "raw-material"', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: 'M' })).class).toBe('raw-material')
  })

  it('returns class=undefined when classe_produto is absent', () => {
    expect(mapProduct(makeApiProduct({ classe_produto: undefined })).class).toBeUndefined()
  })

  // ── packagingType (tipoEmbalagem) ─────────────────────────────────────────

  it('maps tipoEmbalagem 1 to packagingType "envelope"', () => {
    expect(mapProduct(makeApiProduct({ tipoEmbalagem: 1 })).packagingType).toBe('envelope')
  })

  it('maps tipoEmbalagem 2 to packagingType "box"', () => {
    expect(mapProduct(makeApiProduct({ tipoEmbalagem: 2 })).packagingType).toBe('box')
  })

  it('maps tipoEmbalagem 3 to packagingType "cylinder"', () => {
    expect(mapProduct(makeApiProduct({ tipoEmbalagem: 3 })).packagingType).toBe('cylinder')
  })

  it('returns packagingType=undefined when tipoEmbalagem is absent', () => {
    expect(mapProduct(makeApiProduct({ tipoEmbalagem: undefined })).packagingType).toBeUndefined()
  })

  // ── packaging dimensions ──────────────────────────────────────────────────

  it('maps alturaEmbalagem to packagingHeight', () => {
    expect(mapProduct(makeApiProduct({ alturaEmbalagem: '10.5' })).packagingHeight).toBe(10.5)
  })

  it('maps larguraEmbalagem to packagingWidth', () => {
    expect(mapProduct(makeApiProduct({ larguraEmbalagem: '20' })).packagingWidth).toBe(20)
  })

  it('maps comprimentoEmbalagem to packagingLength', () => {
    expect(mapProduct(makeApiProduct({ comprimentoEmbalagem: '30' })).packagingLength).toBe(30)
  })

  it('maps diametroEmbalagem to packagingDiameter', () => {
    expect(mapProduct(makeApiProduct({ diametroEmbalagem: '5' })).packagingDiameter).toBe(5)
  })

  // ── variationType (tipoVariacao) ──────────────────────────────────────────

  it('maps tipoVariacao "N" to variationType "normal"', () => {
    expect(mapProduct(makeApiProduct({ tipoVariacao: 'N' })).variationType).toBe('normal')
  })

  it('maps tipoVariacao "P" to variationType "parent"', () => {
    expect(mapProduct(makeApiProduct({ tipoVariacao: 'P' })).variationType).toBe('parent')
  })

  it('maps tipoVariacao "V" to variationType "variation"', () => {
    expect(mapProduct(makeApiProduct({ tipoVariacao: 'V' })).variationType).toBe('variation')
  })

  it('returns variationType=undefined when tipoVariacao is absent', () => {
    expect(mapProduct(makeApiProduct({ tipoVariacao: undefined })).variationType).toBeUndefined()
  })

  it('maps idProdutoPai to parentProductId as string', () => {
    expect(mapProduct(makeApiProduct({ idProdutoPai: 88 })).parentProductId).toBe('88')
  })

  it('returns parentProductId=undefined when idProdutoPai is absent', () => {
    expect(mapProduct(makeApiProduct({ idProdutoPai: undefined })).parentProductId).toBeUndefined()
  })

  // ── variations ────────────────────────────────────────────────────────────

  it('maps variacoes to variations array', () => {
    const raw = makeApiProduct({
      variacoes: [
        {
          variacao: {
            id: 10,
            codigo: 'VAR-01',
            preco: '99.90',
            grade: { Cor: 'Azul', Tamanho: 'M' },
          },
        },
      ],
    })
    const result = mapProduct(raw)
    expect(result.variations).toHaveLength(1)
    expect(result.variations![0]).toMatchObject({
      id: '10',
      sku: 'VAR-01',
      price: 99.9,
      attributes: { Cor: 'Azul', Tamanho: 'M' },
    })
  })

  it('maps variation mappings', () => {
    const raw = makeApiProduct({
      variacoes: [
        {
          variacao: {
            id: 10,
            grade: {},
            mapeamentos: [
              {
                mapeamento: {
                  idEcommerce: 1,
                  skuMapeamento: 'SKU-MAP',
                  skuMapeamentoPai: 'SKU-PAI',
                  idMapeamentoPai: 5,
                  idMapeamento: 99,
                  preco: '89.90',
                  preco_promocional: '79.90',
                },
              },
            ],
          },
        },
      ],
    })
    const mapping = mapProduct(raw).variations![0].mappings![0]
    expect(mapping).toMatchObject({
      ecommerceId: 1,
      sku: 'SKU-MAP',
      parentSku: 'SKU-PAI',
      parentMappingId: 5,
      mappingId: 99,
      price: 89.9,
      salePrice: 79.9,
    })
  })

  it('returns variations=undefined when variacoes is absent', () => {
    expect(mapProduct(makeApiProduct({ variacoes: undefined })).variations).toBeUndefined()
  })

  // ── kit items ─────────────────────────────────────────────────────────────

  it('maps kit items', () => {
    const raw = makeApiProduct({
      kit: [{ item: { id_produto: 7, quantidade: 2 } }],
    })
    const result = mapProduct(raw)
    expect(result.kitItems).toHaveLength(1)
    expect(result.kitItems![0]).toEqual({ productId: '7', quantity: 2 })
  })

  it('returns kitItems=undefined when kit is absent', () => {
    expect(mapProduct(makeApiProduct({ kit: undefined })).kitItems).toBeUndefined()
  })

  // ── fulfillment ───────────────────────────────────────────────────────────

  it('maps sob_encomenda "S" to madeToOrder=true', () => {
    expect(mapProduct(makeApiProduct({ sob_encomenda: 'S' })).madeToOrder).toBe(true)
  })

  it('maps sob_encomenda "N" to madeToOrder=false', () => {
    expect(mapProduct(makeApiProduct({ sob_encomenda: 'N' })).madeToOrder).toBe(false)
  })

  it('returns madeToOrder=undefined when sob_encomenda is absent', () => {
    expect(mapProduct(makeApiProduct({ sob_encomenda: undefined })).madeToOrder).toBeUndefined()
  })

  it('maps dias_preparacao to preparationDays', () => {
    expect(mapProduct(makeApiProduct({ dias_preparacao: 3 })).preparationDays).toBe(3)
  })

  // ── content ───────────────────────────────────────────────────────────────

  it('maps obs to notes', () => {
    expect(mapProduct(makeApiProduct({ obs: 'Frágil' })).notes).toBe('Frágil')
  })

  it('maps garantia to warranty', () => {
    expect(mapProduct(makeApiProduct({ garantia: '12 meses' })).warranty).toBe('12 meses')
  })

  it('maps anexos to attachments as URL strings', () => {
    const raw = makeApiProduct({ anexos: [{ anexo: 'https://cdn.example.com/file.pdf' }] })
    expect(mapProduct(raw).attachments).toEqual(['https://cdn.example.com/file.pdf'])
  })

  it('maps imagens_externas to externalImages', () => {
    const raw = makeApiProduct({
      imagens_externas: [{ imagem_externa: { url: 'https://cdn.example.com/img.jpg' } }],
    })
    expect(mapProduct(raw).externalImages).toEqual(['https://cdn.example.com/img.jpg'])
  })

  // ── SEO ───────────────────────────────────────────────────────────────────

  it('maps seo_title to seoTitle', () => {
    expect(mapProduct(makeApiProduct({ seo_title: 'Camiseta SEO' })).seoTitle).toBe('Camiseta SEO')
  })

  it('maps seo_keywords to seoKeywords', () => {
    expect(mapProduct(makeApiProduct({ seo_keywords: 'camiseta, polo' })).seoKeywords).toBe('camiseta, polo')
  })

  it('maps seo_description to seoDescription', () => {
    expect(mapProduct(makeApiProduct({ seo_description: 'Desc SEO' })).seoDescription).toBe('Desc SEO')
  })

  it('maps link_video to videoLink', () => {
    expect(mapProduct(makeApiProduct({ link_video: 'https://youtu.be/abc' })).videoLink).toBe('https://youtu.be/abc')
  })

  it('maps slug', () => {
    expect(mapProduct(makeApiProduct({ slug: 'camiseta-polo' })).slug).toBe('camiseta-polo')
  })

  // ── e-commerce mappings ───────────────────────────────────────────────────

  it('maps mapeamentos to mappings', () => {
    const raw = makeApiProduct({
      mapeamentos: [
        {
          mapeamento: {
            idEcommerce: 3,
            skuMapeamento: 'EC-SKU',
            idMapeamento: 55,
            preco: '59.90',
            preco_promocional: '49.90',
          },
        },
      ],
    })
    const mapping = mapProduct(raw).mappings![0]
    expect(mapping).toMatchObject({
      ecommerceId: 3,
      sku: 'EC-SKU',
      mappingId: 55,
      price: 59.9,
      salePrice: 49.9,
    })
  })

  it('returns mappings=undefined when mapeamentos is absent', () => {
    expect(mapProduct(makeApiProduct({ mapeamentos: undefined })).mappings).toBeUndefined()
  })

  // ── full / minimal shapes ─────────────────────────────────────────────────

  it('maps a minimal product (only required fields) correctly', () => {
    const result = mapProduct({ id: 1, nome: 'Produto Simples' })
    expect(result.id).toBe('1')
    expect(result.name).toBe('Produto Simples')
    expect(result.status).toBe('active')
    expect(result.sku).toBeUndefined()
    expect(result.price).toBeUndefined()
    expect(result.grossWeight).toBeUndefined()
    expect(result.unit).toBeUndefined()
    expect(result.description).toBeUndefined()
  })

  it('maps a fully populated base product correctly', () => {
    const result = mapProduct(makeApiProduct())
    expect(result.id).toBe('123')
    expect(result.name).toBe('Camiseta Polo')
    expect(result.sku).toBe('CAM001')
    expect(result.price).toBe(59.9)
    expect(result.grossWeight).toBe(0.3)
    expect(result.unit).toBe('UN')
    expect(result.status).toBe('active')
    expect(result.description).toBe('Camiseta polo masculina')
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
    expect(result[1].status).toBe('inactive')
  })

  it('returns an empty array for an empty input', () => {
    expect(mapProducts([])).toEqual([])
  })
})
