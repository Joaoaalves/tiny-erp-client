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

type ApiRegistros<T> = Array<{ registro: T }> | { registro: T }

export interface ApiCreateOrderResponse {
  retorno: {
    status: string
    registros?: ApiRegistros<{
      id: number
      sequencia: number
      numero: string
      status: string
    }>
  }
}

// ── Update / void ─────────────────────────────────────────────────────────────

export interface ApiStatusResponse {
  retorno: {
    status: string
  }
}
