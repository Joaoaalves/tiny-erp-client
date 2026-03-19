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

// ── Stock (obter) ─────────────────────────────────────────────────────────────

export interface ApiStockDeposit {
  deposito: {
    nome: string
    /** 'S' = ignore, 'N' = use */
    desconsiderar: string
    saldo: number
    empresa?: string
  }
}

export interface ApiGetStockResponse {
  retorno: {
    status: string
    produto: {
      id: number | string
      nome: string
      codigo?: string
      unidade?: string
      /** Total stock balance */
      saldo: number
      /** Reserved stock balance */
      saldoReservado: number
      depositos: ApiStockDeposit[]
    }
  }
}

// ── Stock (update) ────────────────────────────────────────────────────────────

export interface ApiUpdateStockResponse {
  retorno: {
    status: string
    registros?: Array<{
      registro: {
        sequencia: string
        status: string
        id: number
        saldoEstoque: number
        saldoReservado: number
        registroCriado: boolean
      }
    }>
  }
}

// ── Stock updates (atualizacoes) ──────────────────────────────────────────────

export interface ApiStockUpdateDeposit {
  deposito: {
    nome: string
    desconsiderar: string
    saldo: number
  }
}

export interface ApiStockUpdateProduct {
  produto: {
    id: number | string
    nome: string
    codigo?: string
    unidade?: string
    /** N = normal, P = parent, V = variation */
    tipo_variacao?: string
    localizacao?: string
    data_alteracao: string
    saldo: number
    saldoReservado: number
    depositos?: ApiStockUpdateDeposit[]
  }
}

export interface ApiGetStockUpdatesResponse {
  retorno: {
    status: string
    produtos?: ApiStockUpdateProduct[]
  }
}

// ── Structure ─────────────────────────────────────────────────────────────────

export interface ApiStructureComponent {
  id_componente: number | string
  codigo?: string
  nome: string
  quantidade: number | string
}

export interface ApiGetStructureResponse {
  retorno: {
    status: string
    produto: {
      id: number | string
      nome: string
      codigo?: string
      estrutura: ApiStructureComponent[]
    }
  }
}
