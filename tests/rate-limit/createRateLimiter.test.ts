import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '../../src/rate-limit/createRateLimiter'
import { TokenBucketRateLimiter } from '../../src/rate-limit/TokenBucketRateLimiter'
import type { TinyPlan } from '../../src/types/client'

describe('createRateLimiter', () => {
  const plans: TinyPlan[] = ['Começar', 'Crescer', 'Evoluir', 'Potencializar']

  it.each(plans)('returns a TokenBucketRateLimiter for plan "%s"', plan => {
    const limiter = createRateLimiter(plan)
    expect(limiter).toBeInstanceOf(TokenBucketRateLimiter)
  })

  it('implements the RateLimiter interface (has acquire method)', () => {
    const limiter = createRateLimiter('Evoluir')
    expect(typeof limiter.acquire).toBe('function')
  })
})
