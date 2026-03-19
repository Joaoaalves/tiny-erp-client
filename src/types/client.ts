import type { HttpClient } from './http'

export type TinyPlan = 'Começar' | 'Crescer' | 'Evoluir' | 'Potencializar'

export interface TinyClientConfig {
  token: string
  plan: TinyPlan
  httpClient?: HttpClient
}
