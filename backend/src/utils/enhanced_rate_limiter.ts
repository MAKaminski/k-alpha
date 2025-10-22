/**
 * Enhanced rate limiter that integrates with comprehensive request tracking
 * Ensures accurate counting across all Schwab API services
 */

import { requestTracker, trackRequest, getComprehensiveRateLimitStatus } from './request_tracker.js';

interface RateLimitConfig {
  maxCallsPerMinute: number;
  safetyMargin: number; // Percentage to stay below limit (0.25 = 25% below)
}

class EnhancedRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if we can make a call without exceeding rate limits
   */
  canMakeCall(): boolean {
    return requestTracker.canMakeRequest();
  }

  /**
   * Get current call count in the last minute
   */
  getCurrentCallCount(): number {
    return requestTracker.getCurrentRequestCount();
  }

  /**
   * Get time until next call is allowed
   */
  getTimeUntilNextCall(): number {
    return requestTracker.getTimeUntilNextRequest();
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

  /**
   * Get comprehensive rate limit status
   */
  getStatus() {
    return getComprehensiveRateLimitStatus();
  }
}

// Global enhanced rate limiter instance
export const enhancedRateLimiter = new EnhancedRateLimiter({
  maxCallsPerMinute: 120,
  safetyMargin: 0.25 // Use only 75% of rate limit (90 calls/min max)
});

/**
 * Enhanced wrapper function for API calls with service tracking
 */
export async function withEnhancedRateLimit<T>(
  service: string, 
  endpoint: string, 
  method: string = 'GET',
  apiCall: () => Promise<T>
): Promise<T> {
  await enhancedRateLimiter.waitForNextCall();
  return await trackRequest(service, endpoint, method, apiCall);
}

/**
 * Get current rate limit status with detailed breakdown
 */
export function getEnhancedRateLimitStatus() {
  return enhancedRateLimiter.getStatus();
}

/**
 * Log current rate limit status
 */
export function logRateLimitStatus() {
  const status = getEnhancedRateLimitStatus();
  
  if (status.isCritical) {
    console.warn(`🚨 CRITICAL: ${status.currentRequests}/${status.maxSafeRequests} requests used (${status.utilizationPercent.toFixed(1)}%)`);
  } else if (status.isWarning) {
    console.warn(`⚠️  WARNING: ${status.currentRequests}/${status.maxSafeRequests} requests used (${status.utilizationPercent.toFixed(1)}%)`);
  } else {
    console.log(`📊 Rate limit: ${status.currentRequests}/${status.maxSafeRequests} requests used (${status.utilizationPercent.toFixed(1)}%)`);
  }
  
  if (status.breakdown.byService.length > 0) {
    console.log('📈 By service:', status.breakdown.byService.map(s => 
      `${s.service}: ${s.requestsLastMinute} (${s.percentage.toFixed(1)}%)`
    ).join(', '));
  }
}
