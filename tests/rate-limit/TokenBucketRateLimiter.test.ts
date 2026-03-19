import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenBucketRateLimiter } from '../../src/rate-limit/TokenBucketRateLimiter'
import { TinyRateLimitError } from '../../src/errors'

// rpm=60 → 1 token per second (1000ms). Convenient for fake-timer tests.
const RPM = 60
const MS_PER_TOKEN = 60_000 / RPM // 1000ms

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('accepts a valid requestsPerMinute', () => {
      expect(() => new TokenBucketRateLimiter(60)).not.toThrow()
    })

    it('accepts 0 requestsPerMinute (Começar plan)', () => {
      expect(() => new TokenBucketRateLimiter(0)).not.toThrow()
    })

    it('throws when requestsPerMinute is negative', () => {
      expect(() => new TokenBucketRateLimiter(-1)).toThrow('non-negative')
    })
  })

  // ── Começar plan (0 rpm) ─────────────────────────────────────────────────

  describe('when requestsPerMinute is 0', () => {
    it('rejects immediately with TinyRateLimitError', async () => {
      const limiter = new TokenBucketRateLimiter(0)
      await expect(limiter.acquire()).rejects.toBeInstanceOf(TinyRateLimitError)
    })

    it('rejects every call, not just the first', async () => {
      const limiter = new TokenBucketRateLimiter(0)
      await expect(limiter.acquire()).rejects.toBeInstanceOf(TinyRateLimitError)
      await expect(limiter.acquire()).rejects.toBeInstanceOf(TinyRateLimitError)
    })
  })

  // ── Immediate resolution (tokens available) ──────────────────────────────

  describe('when tokens are available', () => {
    it('resolves immediately on first acquire', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      await expect(limiter.acquire()).resolves.toBeUndefined()
    })

    it('resolves all requests up to the initial token count', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      const requests = Array.from({ length: RPM }, () => limiter.acquire())
      await expect(Promise.all(requests)).resolves.toBeDefined()
    })

    it('resolves without advancing time when bucket is full', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      let resolved = false
      limiter.acquire().then(() => { resolved = true })
      await Promise.resolve() // flush microtasks only, no timers
      expect(resolved).toBe(true)
    })
  })

  // ── Queueing (tokens exhausted) ──────────────────────────────────────────

  describe('when tokens are exhausted', () => {
    it('does not resolve a queued request before the timer fires', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      let resolved = false
      limiter.acquire().then(() => { resolved = true })

      await Promise.resolve()
      expect(resolved).toBe(false)
    })

    it('resolves a queued request after one token refills', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      let resolved = false
      const queued = limiter.acquire().then(() => { resolved = true })

      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await queued

      expect(resolved).toBe(true)
    })

    it('resolves multiple queued requests sequentially as tokens refill', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      let r1 = false
      let r2 = false
      const p1 = limiter.acquire().then(() => { r1 = true })
      const p2 = limiter.acquire().then(() => { r2 = true })

      // After 1 token: only p1 resolves
      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await p1
      expect(r1).toBe(true)
      expect(r2).toBe(false)

      // After another token: p2 resolves
      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await p2
      expect(r2).toBe(true)
    })
  })

  // ── scheduleDrain guard (concurrent acquire while draining) ──────────────

  describe('scheduleDrain guard', () => {
    it('handles a new acquire() while a drain timer is already scheduled', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      // p1 queues → drain schedules timer, processing=true
      let r1 = false
      const p1 = limiter.acquire().then(() => { r1 = true })

      // p2 queues → scheduleDrain() sees processing=true → early return
      // p2 will still be handled by the existing timer
      let r2 = false
      const p2 = limiter.acquire().then(() => { r2 = true })

      expect(r1).toBe(false)
      expect(r2).toBe(false)

      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await p1
      expect(r1).toBe(true)
      expect(r2).toBe(false) // still waiting

      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await p2
      expect(r2).toBe(true)
    })
  })

  // ── Token refill ─────────────────────────────────────────────────────────

  describe('token refill', () => {
    it('adds tokens proportional to elapsed time', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      // Advance 3 seconds → 3 tokens added
      await vi.advanceTimersByTimeAsync(3 * MS_PER_TOKEN)

      const three = Array.from({ length: 3 }, () => limiter.acquire())
      await expect(Promise.all(three)).resolves.toBeDefined()
    })

    it('caps refilled tokens at requestsPerMinute', async () => {
      const limiter = new TokenBucketRateLimiter(5)

      // Advance 10 minutes — without cap would produce 50 tokens, capped at 5
      await vi.advanceTimersByTimeAsync(10 * 60_000)

      // 5 requests resolve immediately (full bucket)
      const five = Array.from({ length: 5 }, () => limiter.acquire())
      await expect(Promise.all(five)).resolves.toBeDefined()

      // 6th request must queue (bucket is now empty)
      let resolved = false
      limiter.acquire().then(() => { resolved = true })

      await Promise.resolve()
      expect(resolved).toBe(false)
    })
  })

  // ── Partial token accumulation ────────────────────────────────────────────

  describe('partial token accumulation', () => {
    it('waits for a full token even when fractional tokens have accumulated', async () => {
      const limiter = new TokenBucketRateLimiter(RPM)
      for (let i = 0; i < RPM; i++) await limiter.acquire()

      let resolved = false
      const queued = limiter.acquire().then(() => { resolved = true })

      // Advance only half the time needed for 1 token — should not resolve yet
      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN / 2)
      await Promise.resolve()
      expect(resolved).toBe(false)

      // Advance the remaining half — now a full token is available
      await vi.advanceTimersByTimeAsync(MS_PER_TOKEN)
      await queued
      expect(resolved).toBe(true)
    })
  })
})
