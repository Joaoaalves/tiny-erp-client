import type { ApiProduct, ApiProductWrapper } from '../../mappers/product.mapper'

// ── Search / Changed ──────────────────────────────────────────────────────────

export interface ApiSearchProductsResponse {
  retorno: {
    status: string
    pagina: number
    numero_paginas: number
    produtos?: ApiProductWrapper[]
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export interface ApiGetProductResponse {
  retorno: {
    status: string
    produto: ApiProduct
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface ApiCreateProductResponse {
  retorno: {
    status: string
    registros?: Array<{
      registro: {
        id: number
        sequencia: number
        status: string
      }
    }>
  }
}

// ── Update / Void responses ───────────────────────────────────────────────────

export interface ApiStatusResponse {
  retorno: {
    status: string
  }
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface ApiSaldoEntry {
  saldo: {
    id_deposito: string
    nome_deposito: string
    saldo: number
  }
}

export interface ApiGetStockResponse {
  retorno: {
    status: string
    produto: {
      id: number | string
      saldo: ApiSaldoEntry[]
    }
  }
}

// ── Structure ─────────────────────────────────────────────────────────────────

export interface ApiGetStructureResponse {
  retorno: {
    status: string
    produto: {
      estrutura: unknown
    }
  }
}

// ── Stock updates ─────────────────────────────────────────────────────────────

export interface ApiStockUpdateEntry {
  atualizacao: {
    id: number | string
    quantidade: number
  }
}

export interface ApiGetStockUpdatesResponse {
  retorno: {
    status: string
    atualizacoes?: ApiStockUpdateEntry[]
  }
}
