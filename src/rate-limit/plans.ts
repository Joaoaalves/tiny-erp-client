import type { TinyPlan } from '../types/client'

export interface PlanLimits {
  requestsPerMinute: number
  batchCalls: number
}

export const PLAN_LIMITS: Record<TinyPlan, PlanLimits> = {
  Começar: { requestsPerMinute: 0, batchCalls: 0 },
  Crescer: { requestsPerMinute: 30, batchCalls: 5 },
  Evoluir: { requestsPerMinute: 60, batchCalls: 5 },
  Potencializar: { requestsPerMinute: 120, batchCalls: 5 },
}
