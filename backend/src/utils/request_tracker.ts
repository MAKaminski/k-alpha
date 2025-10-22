/**
 * Global request tracker for Schwab API rate limiting
 * Tracks ALL API requests across ALL services to ensure we stay under 120/min limit
 */

interface RequestLog {
  timestamp: number;
  service: string;
  endpoint: string;
  method: string;
  success: boolean;
}

interface ServiceStats {
  service: string;
  requestsLastMinute: number;
  totalRequests: number;
  lastRequestTime: number;
}

class RequestTracker {
  private requests: RequestLog[] = [];
  private readonly maxRequestsPerMinute = 120;
  private readonly safetyMargin = 0.25; // Use only 75% of limit
  private readonly warningThreshold = 0.5; // Warn at 50% of safe limit

  /**
   * Log an API request
   */
  logRequest(service: string, endpoint: string, method: string = 'GET', success: boolean = true): void {
    const request: RequestLog = {
      timestamp: Date.now(),
      service,
      endpoint,
      method,
      success
    };

    this.requests.push(request);
    
    // Clean up old requests (older than 1 minute)
    this.cleanupOldRequests();
  }

  /**
   * Get current request count in the last minute
   */
  getCurrentRequestCount(): number {
    this.cleanupOldRequests();
    return this.requests.length;
  }

  /**
   * Get requests by service in the last minute
   */
  getServiceStats(): ServiceStats[] {
    this.cleanupOldRequests();
    
    const serviceMap = new Map<string, ServiceStats>();
    
    this.requests.forEach(request => {
      const existing = serviceMap.get(request.service);
      if (existing) {
        existing.requestsLastMinute++;
        existing.totalRequests++;
        existing.lastRequestTime = Math.max(existing.lastRequestTime, request.timestamp);
      } else {
        serviceMap.set(request.service, {
          service: request.service,
          requestsLastMinute: 1,
          totalRequests: 1,
          lastRequestTime: request.timestamp
        });
      }
    });

    return Array.from(serviceMap.values());
  }

  /**
   * Check if we can make a request without exceeding limits
   */
  canMakeRequest(): boolean {
    const currentCount = this.getCurrentRequestCount();
    const maxSafe = Math.floor(this.maxRequestsPerMinute * (1 - this.safetyMargin));
    return currentCount < maxSafe;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    // Find the oldest request that will expire in the next minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const oldRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
    if (oldRequests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...oldRequests.map(r => r.timestamp));
    const timeUntilExpiry = (oldestRequest + 60000) - now;
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    const currentCount = this.getCurrentRequestCount();
    const maxSafe = Math.floor(this.maxRequestsPerMinute * (1 - this.safetyMargin));
    const warningThreshold = Math.floor(maxSafe * this.warningThreshold);
    
    return {
      currentRequests: currentCount,
      maxSafeRequests: maxSafe,
      warningThreshold: warningThreshold,
      canMakeRequest: this.canMakeRequest(),
      timeUntilNext: this.getTimeUntilNextRequest(),
      utilizationPercent: (currentCount / maxSafe) * 100,
      isWarning: currentCount >= warningThreshold,
      isCritical: currentCount >= maxSafe * 0.8
    };
  }

  /**
   * Get detailed breakdown by service
   */
  getDetailedBreakdown() {
    const stats = this.getServiceStats();
    const total = this.getCurrentRequestCount();
    
    return {
      totalRequests: total,
      byService: stats.map(stat => ({
        ...stat,
        percentage: total > 0 ? (stat.requestsLastMinute / total) * 100 : 0
      })),
      topService: stats.reduce((max, current) => 
        current.requestsLastMinute > max.requestsLastMinute ? current : max, 
        { service: 'none', requestsLastMinute: 0, totalRequests: 0, lastRequestTime: 0 }
      )
    };
  }

  /**
   * Clean up requests older than 1 minute
   */
  private cleanupOldRequests(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(request => request.timestamp > oneMinuteAgo);
  }

  /**
   * Get request history for debugging
   */
  getRequestHistory(limit: number = 50): RequestLog[] {
    return this.requests
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Reset all tracking (for testing)
   */
  reset(): void {
    this.requests = [];
  }
}

// Global request tracker instance
export const requestTracker = new RequestTracker();

/**
 * Wrapper function to track API requests
 */
export function trackRequest<T>(
  service: string, 
  endpoint: string, 
  method: string = 'GET',
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return apiCall()
    .then(result => {
      requestTracker.logRequest(service, endpoint, method, true);
      return result;
    })
    .catch(error => {
      requestTracker.logRequest(service, endpoint, method, false);
      throw error;
    });
}

/**
 * Get comprehensive rate limit status
 */
export function getComprehensiveRateLimitStatus() {
  const status = requestTracker.getRateLimitStatus();
  const breakdown = requestTracker.getDetailedBreakdown();
  
  return {
    ...status,
    breakdown,
    services: requestTracker.getServiceStats()
  };
}

/**
 * Log rate limit status (for monitoring)
 */
export function logRateLimitStatus() {
  const status = getComprehensiveRateLimitStatus();
  
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
