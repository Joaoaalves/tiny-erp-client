import type { TinyPlan } from '../types/client'
import { PLAN_LIMITS } from './plans'
import { TokenBucketRateLimiter } from './TokenBucketRateLimiter'

export function createRateLimiter(plan: TinyPlan): TokenBucketRateLimiter {
  const { requestsPerMinute } = PLAN_LIMITS[plan]
  return new TokenBucketRateLimiter(requestsPerMinute)
}
