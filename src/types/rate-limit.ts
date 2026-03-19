export interface RateLimiter {
  acquire(): Promise<void>
}
