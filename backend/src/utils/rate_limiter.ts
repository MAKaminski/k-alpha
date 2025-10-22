/**
 * Rate limiter to ensure we stay well below Schwab's 120 calls/minute limit
 */

interface RateLimitConfig {
  maxCallsPerMinute: number;
  safetyMargin: number; // Percentage to stay below limit (0.25 = 25% below)
}

export class RateLimiter {
  private calls: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if we can make a call without exceeding rate limits
   */
  canMakeCall(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove calls older than 1 minute
    this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);
    
    const maxAllowed = Math.floor(this.config.maxCallsPerMinute * (1 - this.config.safetyMargin));
    return this.calls.length < maxAllowed;
  }

  /**
   * Record a call
   */
  recordCall(): void {
    this.calls.push(Date.now());
  }

  /**
   * Get current call count in the last minute
   */
  getCurrentCallCount(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);
    return this.calls.length;
  }

  /**
   * Get time until next call is allowed
   */
  getTimeUntilNextCall(): number {
    if (this.canMakeCall()) {
      return 0;
    }

    const oldestCall = Math.min(...this.calls);
    const timeUntilOldestExpires = (oldestCall + 60000) - Date.now();
    return Math.max(0, timeUntilOldestExpires);
  }

  /**
   * Wait until we can make a call
   */
  async waitForNextCall(): Promise<void> {
    const waitTime = this.getTimeUntilNextCall();
    if (waitTime > 0) {
      console.log(`Rate limit: waiting ${waitTime}ms before next call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter({
  maxCallsPerMinute: 120,
  safetyMargin: 0.25 // Use only 75% of rate limit (90 calls/min max)
});

/**
 * Wrapper function to ensure rate limiting for API calls
 */
export async function withRateLimit<T>(apiCall: () => Promise<T>): Promise<T> {
  await rateLimiter.waitForNextCall();
  rateLimiter.recordCall();
  return await apiCall();
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus() {
  return {
    currentCalls: rateLimiter.getCurrentCallCount(),
    maxCalls: 90, // 75% of 120
    canMakeCall: rateLimiter.canMakeCall(),
    timeUntilNext: rateLimiter.getTimeUntilNextCall()
  };
}
