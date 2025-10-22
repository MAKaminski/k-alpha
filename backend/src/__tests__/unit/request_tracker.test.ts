import { RequestTracker, trackRequest, getComprehensiveRateLimitStatus } from '../../utils/request_tracker.js';

describe('Request Tracker Tests', () => {
  let requestTracker: RequestTracker;

  beforeEach(() => {
    requestTracker = new RequestTracker();
  });

  describe('Basic Request Tracking', () => {
    it('should track requests correctly', () => {
      requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      requestTracker.logRequest('options', '/chains', 'GET', true);
      requestTracker.logRequest('quotes', '/quotes', 'GET', false);

      expect(requestTracker.getCurrentRequestCount()).toBe(3);
    });

    it('should track service-specific stats', () => {
      requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      requestTracker.logRequest('options', '/chains', 'GET', true);

      const stats = requestTracker.getServiceStats();
      
      expect(stats).toHaveLength(2);
      
      const quotesStats = stats.find(s => s.service === 'quotes');
      const optionsStats = stats.find(s => s.service === 'options');
      
      expect(quotesStats?.requestsLastMinute).toBe(2);
      expect(optionsStats?.requestsLastMinute).toBe(1);
    });

    it('should clean up old requests', (done) => {
      requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      expect(requestTracker.getCurrentRequestCount()).toBe(1);

      // Mock time to simulate 1 minute passing
      const originalNow = Date.now;
      Date.now = () => originalNow() + 61000; // 61 seconds later

      setTimeout(() => {
        expect(requestTracker.getCurrentRequestCount()).toBe(0);
        
        // Restore original Date.now
        Date.now = originalNow;
        done();
      }, 100);
    });
  });

  describe('Rate Limit Checking', () => {
    it('should allow requests within safe limit', () => {
      // Fill up to safe limit (90 requests)
      for (let i = 0; i < 90; i++) {
        requestTracker.logRequest('test', '/test', 'GET', true);
      }

      expect(requestTracker.canMakeRequest()).toBe(true);
    });

    it('should block requests when approaching limit', () => {
      // Fill up to safe limit
      for (let i = 0; i < 90; i++) {
        requestTracker.logRequest('test', '/test', 'GET', true);
      }

      // One more should be blocked
      expect(requestTracker.canMakeRequest()).toBe(false);
    });

    it('should calculate time until next request correctly', () => {
      // Fill up to safe limit
      for (let i = 0; i < 90; i++) {
        requestTracker.logRequest('test', '/test', 'GET', true);
      }

      const timeUntilNext = requestTracker.getTimeUntilNextRequest();
      expect(timeUntilNext).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Status', () => {
    it('should return comprehensive status', () => {
      requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      requestTracker.logRequest('options', '/chains', 'GET', true);

      const status = requestTracker.getRateLimitStatus();
      
      expect(status).toHaveProperty('currentRequests');
      expect(status).toHaveProperty('maxSafeRequests');
      expect(status).toHaveProperty('warningThreshold');
      expect(status).toHaveProperty('canMakeRequest');
      expect(status).toHaveProperty('timeUntilNext');
      expect(status).toHaveProperty('utilizationPercent');
      expect(status).toHaveProperty('isWarning');
      expect(status).toHaveProperty('isCritical');

      expect(status.currentRequests).toBe(2);
      expect(status.maxSafeRequests).toBe(90);
      expect(status.canMakeRequest).toBe(true);
      expect(status.isWarning).toBe(false);
      expect(status.isCritical).toBe(false);
    });

    it('should trigger warnings at appropriate thresholds', () => {
      // Fill up to warning threshold (45 requests)
      for (let i = 0; i < 45; i++) {
        requestTracker.logRequest('test', '/test', 'GET', true);
      }

      const status = requestTracker.getRateLimitStatus();
      expect(status.isWarning).toBe(true);
      expect(status.isCritical).toBe(false);
    });

    it('should trigger critical alerts at high thresholds', () => {
      // Fill up to critical threshold (72 requests)
      for (let i = 0; i < 72; i++) {
        requestTracker.logRequest('test', '/test', 'GET', true);
      }

      const status = requestTracker.getRateLimitStatus();
      expect(status.isCritical).toBe(true);
    });
  });

  describe('Detailed Breakdown', () => {
    it('should provide detailed breakdown by service', () => {
      // Add requests from different services
      for (let i = 0; i < 10; i++) {
        requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      }
      for (let i = 0; i < 5; i++) {
        requestTracker.logRequest('options', '/chains', 'GET', true);
      }
      for (let i = 0; i < 3; i++) {
        requestTracker.logRequest('trading', '/orders', 'POST', true);
      }

      const breakdown = requestTracker.getDetailedBreakdown();
      
      expect(breakdown.totalRequests).toBe(18);
      expect(breakdown.byService).toHaveLength(3);
      
      const quotesService = breakdown.byService.find(s => s.service === 'quotes');
      const optionsService = breakdown.byService.find(s => s.service === 'options');
      const tradingService = breakdown.byService.find(s => s.service === 'trading');
      
      expect(quotesService?.requestsLastMinute).toBe(10);
      expect(quotesService?.percentage).toBeCloseTo(55.56, 1);
      
      expect(optionsService?.requestsLastMinute).toBe(5);
      expect(optionsService?.percentage).toBeCloseTo(27.78, 1);
      
      expect(tradingService?.requestsLastMinute).toBe(3);
      expect(tradingService?.percentage).toBeCloseTo(16.67, 1);
    });
  });

  describe('trackRequest Wrapper', () => {
    it('should track successful API calls', async () => {
      const mockApiCall = async () => 'success';
      
      const result = await trackRequest('test', '/test', 'GET', mockApiCall);
      
      expect(result).toBe('success');
      expect(requestTracker.getCurrentRequestCount()).toBe(1);
    });

    it('should track failed API calls', async () => {
      const mockApiCall = async () => {
        throw new Error('API Error');
      };
      
      await expect(trackRequest('test', '/test', 'GET', mockApiCall)).rejects.toThrow('API Error');
      expect(requestTracker.getCurrentRequestCount()).toBe(1);
    });

    it('should track multiple calls correctly', async () => {
      const mockApiCall1 = async () => 'result1';
      const mockApiCall2 = async () => 'result2';
      
      await trackRequest('service1', '/endpoint1', 'GET', mockApiCall1);
      await trackRequest('service2', '/endpoint2', 'POST', mockApiCall2);
      
      expect(requestTracker.getCurrentRequestCount()).toBe(2);
      
      const stats = requestTracker.getServiceStats();
      expect(stats).toHaveLength(2);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical usage pattern', async () => {
      // Simulate 1 minute of typical usage
      const startTime = Date.now();
      
      // Quotes every 2 seconds (30 calls)
      for (let i = 0; i < 30; i++) {
        requestTracker.logRequest('quotes', '/quotes', 'GET', true);
      }
      
      // Options every 2 seconds during market hours (15 calls)
      for (let i = 0; i < 15; i++) {
        requestTracker.logRequest('options', '/chains', 'GET', true);
      }
      
      // Account checks every 5 minutes (1 call)
      requestTracker.logRequest('account', '/accounts', 'GET', true);
      
      const status = requestTracker.getRateLimitStatus();
      
      expect(status.currentRequests).toBe(46);
      expect(status.canMakeRequest).toBe(true);
      expect(status.utilizationPercent).toBeCloseTo(51.1, 1);
    });

    it('should handle burst scenarios', () => {
      // Simulate a burst of requests
      for (let i = 0; i < 50; i++) {
        requestTracker.logRequest('burst', '/burst', 'GET', true);
      }
      
      const status = requestTracker.getRateLimitStatus();
      expect(status.currentRequests).toBe(50);
      expect(status.canMakeRequest).toBe(true);
      expect(status.isWarning).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request log', () => {
      const status = requestTracker.getRateLimitStatus();
      expect(status.currentRequests).toBe(0);
      expect(status.canMakeRequest()).toBe(true);
    });

    it('should handle requests with different methods', () => {
      requestTracker.logRequest('test', '/test', 'GET', true);
      requestTracker.logRequest('test', '/test', 'POST', true);
      requestTracker.logRequest('test', '/test', 'PUT', true);
      requestTracker.logRequest('test', '/test', 'DELETE', true);
      
      expect(requestTracker.getCurrentRequestCount()).toBe(4);
    });

    it('should handle mixed success/failure requests', () => {
      requestTracker.logRequest('test', '/test', 'GET', true);
      requestTracker.logRequest('test', '/test', 'GET', false);
      requestTracker.logRequest('test', '/test', 'GET', true);
      
      expect(requestTracker.getCurrentRequestCount()).toBe(3);
    });
  });
});
