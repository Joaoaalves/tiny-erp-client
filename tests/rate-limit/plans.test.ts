import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS } from '../../src/rate-limit/plans'

describe('PLAN_LIMITS', () => {
  it('Começar: 0 requests/min and 0 batch calls', () => {
    expect(PLAN_LIMITS['Começar']).toEqual({ requestsPerMinute: 0, batchCalls: 0 })
  })

  it('Crescer: 30 requests/min and 5 batch calls', () => {
    expect(PLAN_LIMITS['Crescer']).toEqual({ requestsPerMinute: 30, batchCalls: 5 })
  })

  it('Evoluir: 60 requests/min and 5 batch calls', () => {
    expect(PLAN_LIMITS['Evoluir']).toEqual({ requestsPerMinute: 60, batchCalls: 5 })
  })

  it('Potencializar: 120 requests/min and 5 batch calls', () => {
    expect(PLAN_LIMITS['Potencializar']).toEqual({ requestsPerMinute: 120, batchCalls: 5 })
  })
})
