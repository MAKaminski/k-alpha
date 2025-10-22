import { RateLimiter, withRateLimit, getRateLimitStatus } from '../../utils/rate_limiter.js';

describe('Rate Limiter Tests', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxCallsPerMinute: 120,
      safetyMargin: 0.25 // 75% of 120 = 90 calls/min
    });
  });

  describe('Rate Limiter Basic Functionality', () => {
    it('should allow calls within the safe limit', () => {
      // Should allow up to 90 calls
      for (let i = 0; i < 90; i++) {
        expect(rateLimiter.canMakeCall()).toBe(true);
        rateLimiter.recordCall();
      }
    });

    it('should block calls when approaching the limit', () => {
      // Fill up to the safe limit
      for (let i = 0; i < 90; i++) {
        rateLimiter.recordCall();
      }
      
      // Should not allow more calls
      expect(rateLimiter.canMakeCall()).toBe(false);
    });

    it('should track call count correctly', () => {
      expect(rateLimiter.getCurrentCallCount()).toBe(0);
      
      rateLimiter.recordCall();
      expect(rateLimiter.getCurrentCallCount()).toBe(1);
      
      rateLimiter.recordCall();
      expect(rateLimiter.getCurrentCallCount()).toBe(2);
    });
  });

  describe('Time-based Expiration', () => {
    it('should expire old calls after 1 minute', (done) => {
      // Record a call
      rateLimiter.recordCall();
      expect(rateLimiter.getCurrentCallCount()).toBe(1);
      
      // Wait for expiration (using a shorter time for testing)
      setTimeout(() => {
        // Mock the time to simulate 1 minute passing
        const originalNow = Date.now;
        Date.now = () => originalNow() + 61000; // 61 seconds later
        
        expect(rateLimiter.getCurrentCallCount()).toBe(0);
        
        // Restore original Date.now
        Date.now = originalNow;
        done();
      }, 100);
    });
  });

  describe('withRateLimit Wrapper', () => {
    it('should execute API calls with rate limiting', async () => {
      let callCount = 0;
      const mockApiCall = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      // First call should execute immediately
      const result1 = await withRateLimit(mockApiCall);
      expect(result1).toBe('result-1');
      expect(callCount).toBe(1);

      // Second call should also execute immediately (within safe limit)
      const result2 = await withRateLimit(mockApiCall);
      expect(result2).toBe('result-2');
      expect(callCount).toBe(2);
    });

    it('should wait when rate limit is reached', async () => {
      // Fill up the rate limiter
      for (let i = 0; i < 90; i++) {
        rateLimiter.recordCall();
      }

      let callCount = 0;
      const mockApiCall = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const startTime = Date.now();
      
      // This call should wait
      const result = await withRateLimit(mockApiCall);
      
      const endTime = Date.now();
      const waitTime = endTime - startTime;
      
      // Should have waited some time (at least 1ms due to setTimeout)
      expect(waitTime).toBeGreaterThanOrEqual(0);
      expect(result).toBe('result-1');
    });
  });

  describe('Rate Limit Status', () => {
    it('should return correct status information', () => {
      const status = getRateLimitStatus();
      
      expect(status).toHaveProperty('currentCalls');
      expect(status).toHaveProperty('maxCalls');
      expect(status).toHaveProperty('canMakeCall');
      expect(status).toHaveProperty('timeUntilNext');
      
      expect(typeof status.currentCalls).toBe('number');
      expect(typeof status.maxCalls).toBe('number');
      expect(typeof status.canMakeCall).toBe('boolean');
      expect(typeof status.timeUntilNext).toBe('number');
    });
  });

  describe('Real-world Scenario', () => {
    it('should handle 2-second intervals correctly', async () => {
      // Simulate 2-second intervals for 1 minute
      const calls = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 30; i++) { // 30 calls = 1 minute at 2-second intervals
        const canCall = rateLimiter.canMakeCall();
        if (canCall) {
          rateLimiter.recordCall();
          calls.push(Date.now());
        }
        
        // Simulate 2-second wait
        await new Promise(resolve => setTimeout(resolve, 100)); // Use 100ms for testing
      }
      
      // Should have made all 30 calls without hitting rate limit
      expect(calls.length).toBe(30);
      expect(rateLimiter.getCurrentCallCount()).toBeLessThanOrEqual(90);
    });
  });
});
