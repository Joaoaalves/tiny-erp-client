import type { ApiOrder, ApiOrderWrapper } from '../../mappers/order.mapper'

// ── Search ────────────────────────────────────────────────────────────────────

export interface ApiSearchOrdersResponse {
  retorno: {
    status: string
    pagina: number
    numero_paginas: number
    pedidos?: ApiOrderWrapper[]
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export interface ApiGetOrderResponse {
  retorno: {
    status: string
    pedido: ApiOrder
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface ApiCreateOrderResponse {
  retorno: {
    status: string
    registros?: Array<{
      registro: {
        id: number
        sequencia: number
        numero: string
        status: string
      }
    }>
  }
}

// ── Update / void ─────────────────────────────────────────────────────────────

export interface ApiStatusResponse {
  retorno: {
    status: string
  }
}
