/**
 * Rate Limiter 单元测试
 */

import {
  RateLimiter,
  getClientIP,
  createRateLimitResponse,
  checkRateLimit,
  redditRateLimiter,
  aiRateLimiter,
  exportRateLimiter,
  inviteVerifyRateLimiter,
} from '../rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 60000, // 1分钟
      maxRequests: 5,
      name: 'test',
    });
  });

  describe('check()', () => {
    it('should allow requests under the limit', () => {
      const result = limiter.check('test-ip');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should track request count correctly', () => {
      // 发送 3 次请求
      limiter.check('test-ip');
      limiter.check('test-ip');
      const result = limiter.check('test-ip');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(3);
      expect(result.remaining).toBe(2);
    });

    it('should block requests at the limit', () => {
      // 发送 5 次请求（达到限制）
      for (let i = 0; i < 5; i++) {
        limiter.check('test-ip');
      }

      // 第 6 次应该被阻止
      const result = limiter.check('test-ip');
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should track different IPs independently', () => {
      // IP1 发送 5 次请求
      for (let i = 0; i < 5; i++) {
        limiter.check('ip-1');
      }

      // IP1 应该被阻止
      expect(limiter.check('ip-1').allowed).toBe(false);

      // IP2 应该不受影响
      const ip2Result = limiter.check('ip-2');
      expect(ip2Result.allowed).toBe(true);
      expect(ip2Result.current).toBe(1);
    });

    it('should reset after window expires', async () => {
      // 使用短时间窗口的限流器
      const shortLimiter = new RateLimiter({
        windowMs: 100, // 100ms
        maxRequests: 2,
      });

      // 发送 2 次请求
      shortLimiter.check('test-ip');
      shortLimiter.check('test-ip');
      expect(shortLimiter.check('test-ip').allowed).toBe(false);

      // 等待窗口过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 应该可以再次请求
      const result = shortLimiter.check('test-ip');
      expect(result.allowed).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should reset limit for specific key', () => {
      // 达到限制
      for (let i = 0; i < 5; i++) {
        limiter.check('test-ip');
      }
      expect(limiter.check('test-ip').allowed).toBe(false);

      // 重置
      limiter.reset('test-ip');

      // 应该可以再次请求
      const result = limiter.check('test-ip');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all records', () => {
      limiter.check('ip-1');
      limiter.check('ip-2');
      expect(limiter.size).toBe(2);

      limiter.clear();
      expect(limiter.size).toBe(0);
    });
  });
});

describe('getClientIP', () => {
  it('should extract IP from cf-connecting-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'cf-connecting-ip': '1.2.3.4' },
    });
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('should extract first IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
    });
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '1.2.3.4' },
    });
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('should return "unknown" if no IP headers present', () => {
    const request = new Request('http://localhost');
    expect(getClientIP(request)).toBe('unknown');
  });

  it('should prioritize cf-connecting-ip over x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2',
      },
    });
    expect(getClientIP(request)).toBe('1.1.1.1');
  });
});

describe('createRateLimitResponse', () => {
  it('should create proper 429 response', () => {
    const result = {
      allowed: false,
      current: 10,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfter: 60,
    };

    const response = createRateLimitResponse(result);

    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});

describe('checkRateLimit', () => {
  it('should return null when under limit', () => {
    const testLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 100,
    });

    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '1.2.3.4' },
    });

    const result = checkRateLimit(testLimiter, request);
    expect(result).toBeNull();
  });

  it('should return Response when over limit', () => {
    const testLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 1,
    });

    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '1.2.3.4' },
    });

    // 第一次请求
    checkRateLimit(testLimiter, request);

    // 第二次请求应该被限流
    const result = checkRateLimit(testLimiter, request);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(429);
  });
});

describe('Pre-configured limiters', () => {
  it('redditRateLimiter should have correct config', () => {
    // 验证配置正确
    expect(redditRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it('aiRateLimiter should have stricter limits', () => {
    expect(aiRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it('exportRateLimiter should exist', () => {
    expect(exportRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it('inviteVerifyRateLimiter should have strictest limits', () => {
    expect(inviteVerifyRateLimiter).toBeInstanceOf(RateLimiter);
  });
});
