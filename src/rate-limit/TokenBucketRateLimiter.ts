import type { RateLimiter } from '../types/rate-limit'
import { TinyRateLimitError } from '../errors'

export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number
  private lastRefill: number
  private processing = false
  private readonly queue: Array<() => void> = []

  constructor(private readonly requestsPerMinute: number) {
    if (requestsPerMinute < 0) {
      throw new Error('requestsPerMinute must be non-negative')
    }
    this.tokens = requestsPerMinute
    this.lastRefill = Date.now()
  }

  acquire(): Promise<void> {
    if (this.requestsPerMinute === 0) {
      return Promise.reject(new TinyRateLimitError())
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve)
      this.scheduleDrain()
    })
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const added = (elapsed / 60_000) * this.requestsPerMinute
    this.tokens = Math.min(this.requestsPerMinute, this.tokens + added)
    this.lastRefill = now
  }

  private scheduleDrain(): void {
    if (this.processing) return
    this.processing = true
    this.drain()
  }

  private drain(): void {
    this.refill()

    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1
      this.queue.shift()!()
    }

    if (this.queue.length > 0) {
      const msPerToken = 60_000 / this.requestsPerMinute
      const waitMs = Math.max(1, Math.ceil(msPerToken * (1 - this.tokens)))
      setTimeout(() => this.drain(), waitMs)
    } else {
      this.processing = false
    }
  }
}
