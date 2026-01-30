/**
 * Reddit API 路由单元测试
 */

import { NextRequest } from 'next/server';
import { GET as searchGET } from '../reddit/search/route';
import { GET as commentsGET } from '../reddit/comments/route';
import { GET as subredditGET } from '../reddit/subreddit/route';

// Mock fetch-helper
jest.mock('@/lib/api/fetch-helper', () => ({
  fetchWithFallbacks: jest.fn(),
}));

// Mock rate-limiter
jest.mock('@/lib/rate-limiter', () => ({
  redditRateLimiter: {
    check: jest.fn(() => ({ allowed: true, current: 1, limit: 30, remaining: 29 })),
  },
  checkRateLimit: jest.fn(() => null), // Not rate limited
}));

import { fetchWithFallbacks } from '@/lib/api/fetch-helper';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockFetchWithFallbacks = fetchWithFallbacks as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

describe('/api/reddit/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('关键词');
    });

    it('should return 400 for query exceeding 200 characters', async () => {
      const longQuery = 'a'.repeat(201);
      const request = new NextRequest(`http://localhost/api/reddit/search?q=${longQuery}`);
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search?q=test&limit=abc');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Limit');
    });

    it('should return 400 for limit out of range', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search?q=test&limit=200');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid sort parameter', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search?q=test&type=post&sort=invalid');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('排序');
    });

    it('should return 400 for invalid time range', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search?q=test&type=post&t=invalid');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('时间范围');
    });

    it('should return 400 for invalid subreddit format', async () => {
      const request = new NextRequest('http://localhost/api/reddit/search?q=test&subreddit=invalid-name!');
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Subreddit');
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
      );

      const request = new NextRequest('http://localhost/api/reddit/search?q=test');
      const response = await searchGET(request);
      
      expect(response.status).toBe(429);
    });
  });

  describe('Successful responses', () => {
    it('should return search results for subreddit type', async () => {
      const mockData = {
        data: {
          children: [
            { data: { id: '1', display_name: 'test', subscribers: 1000 } },
          ],
        },
      };
      mockFetchWithFallbacks.mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const request = new NextRequest('http://localhost/api/reddit/search?q=test&type=subreddit');
      const response = await searchGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.children).toBeDefined();
    });

    it('should return search results for post type', async () => {
      const mockData = {
        data: {
          children: [
            { data: { id: '1', title: 'Test Post', score: 100 } },
          ],
        },
      };
      mockFetchWithFallbacks.mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const request = new NextRequest('http://localhost/api/reddit/search?q=test&type=post&sort=hot&t=day');
      const response = await searchGET(request);
      
      expect(response.status).toBe(200);
    });

    it('should include cache headers', async () => {
      mockFetchWithFallbacks.mockResolvedValue({
        json: () => Promise.resolve({ data: { children: [] } }),
      });

      const request = new NextRequest('http://localhost/api/reddit/search?q=test');
      const response = await searchGET(request);
      
      expect(response.headers.get('X-Cache')).toBeDefined();
      expect(response.headers.get('Cache-Control')).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetchWithFallbacks.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost/api/reddit/search?q=test');
      const response = await searchGET(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('API 请求失败');
    });
  });
});

describe('/api/reddit/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing subreddit', async () => {
      const request = new NextRequest('http://localhost/api/reddit/comments?postId=abc123');
      const response = await commentsGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('subreddit');
    });

    it('should return 400 for missing postId', async () => {
      const request = new NextRequest('http://localhost/api/reddit/comments?subreddit=test');
      const response = await commentsGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid subreddit format', async () => {
      const request = new NextRequest('http://localhost/api/reddit/comments?subreddit=invalid!name&postId=abc123');
      const response = await commentsGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Subreddit');
    });

    it('should return 400 for invalid postId format', async () => {
      const request = new NextRequest('http://localhost/api/reddit/comments?subreddit=test&postId=invalid-id!');
      const response = await commentsGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Post ID');
    });
  });

  describe('Successful responses', () => {
    it('should return comments', async () => {
      const mockData = [
        { data: {} },
        { data: { children: [{ kind: 't1', data: { body: 'test comment' } }] } },
      ];
      mockFetchWithFallbacks.mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const request = new NextRequest('http://localhost/api/reddit/comments?subreddit=test&postId=abc123');
      const response = await commentsGET(request);
      
      expect(response.status).toBe(200);
    });
  });
});

describe('/api/reddit/subreddit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing subreddit', async () => {
      const request = new NextRequest('http://localhost/api/reddit/subreddit');
      const response = await subredditGET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('subreddit');
    });

    it('should return 400 for invalid subreddit format', async () => {
      const request = new NextRequest('http://localhost/api/reddit/subreddit?subreddit=invalid!');
      const response = await subredditGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid limit', async () => {
      const request = new NextRequest('http://localhost/api/reddit/subreddit?subreddit=test&limit=abc');
      const response = await subredditGET(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Successful responses', () => {
    it('should return subreddit posts', async () => {
      const mockData = {
        data: {
          children: [
            { data: { id: '1', title: 'Test Post' } },
          ],
        },
      };
      mockFetchWithFallbacks.mockResolvedValue({
        json: () => Promise.resolve(mockData),
      });

      const request = new NextRequest('http://localhost/api/reddit/subreddit?subreddit=test&limit=10');
      const response = await subredditGET(request);
      
      expect(response.status).toBe(200);
    });
  });
});
