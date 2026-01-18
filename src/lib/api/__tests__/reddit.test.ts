import { redditApi } from '../reddit';
import type { Subreddit, Post, Comment } from '@/lib/types';

global.fetch = jest.fn();

describe('RedditApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchSubreddits', () => {
    it('应该成功搜索 Subreddits', async () => {
      const mockData = {
        data: {
          children: [
            {
              data: {
                id: 'test1',
                name: 't5_test1',
                display_name: 'TestSub',
                title: 'Test Subreddit',
                public_description: 'A test subreddit',
                subscribers: 1000,
                url: '/r/TestSub',
              },
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const results = await redditApi.searchSubreddits('test');

      expect(results).toHaveLength(1);
      expect(results[0].display_name).toBe('TestSub');
      expect(results[0].subscriber_count).toBe(1000);
    });

    it('应该处理空结果', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { children: [] } }),
      });

      const results = await redditApi.searchSubreddits('nonexistent');

      expect(results).toEqual([]);
    });

    it('应该处理 API 错误', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const results = await redditApi.searchSubreddits('test');
      expect(results).toEqual([]);
    }, 10000);

    it('应该支持请求取消', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const abortController = new AbortController();
      
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('AbortError');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      setTimeout(() => abortController.abort(), 50);

      const results = await redditApi.searchSubreddits('test', abortController.signal);
      expect(results).toEqual([]);
    });
  });

  describe('searchPosts', () => {
    it('应该成功搜索帖子', async () => {
      const mockData = {
        data: {
          children: [
            {
              data: {
                id: 'post1',
                title: 'Test Post',
                selftext: 'Test content',
                author: 'testuser',
                subreddit: 'testsub',
                score: 100,
                num_comments: 10,
                created_utc: Date.now() / 1000,
                url: 'https://reddit.com/test',
              },
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const results = await redditApi.searchPosts('test', 'testsub');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Post');
      expect(results[0].subreddit).toBe('testsub');
    });

    it('应该支持排序和时间范围参数', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { children: [] } }),
      });

      await redditApi.searchPosts('test', 'testsub', 'top', 'week');

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      const decodedUrl = decodeURIComponent(callUrl);
      expect(decodedUrl).toContain('sort=top');
      expect(decodedUrl).toContain('t=week');
    });
  });

  describe('getComments', () => {
    it('应该成功获取评论', async () => {
      const mockData = [
        { data: { children: [] } },
        {
          data: {
            children: [
              {
                kind: 't1',
                data: {
                  id: 'comment1',
                  body: 'Test comment',
                  author: 'user1',
                  score: 10,
                  created_utc: Date.now() / 1000,
                  parent_id: 't3_post1',
                },
              },
            ],
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const results = await redditApi.getComments('testsub', 'post1');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].body).toBe('Test comment');
      expect(results[0].author).toBe('user1');
    });

    it('应该限制评论数量', async () => {
      const mockComments = Array.from({ length: 200 }, (_, i) => ({
        data: {
          id: `comment${i}`,
          body: `Comment ${i}`,
          author: 'user',
          score: 1,
          created_utc: Date.now() / 1000,
          parent_id: 'post1',
        },
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {},
          { data: { children: mockComments } },
        ],
      });

      const results = await redditApi.getComments('testsub', 'post1', 100);

      expect(results.length).toBeLessThanOrEqual(100);
    });

    it('应该处理 429 错误并重试', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['Retry-After', '1']]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ data: { children: [] } }, { data: { children: [] } }],
        });

      const results = await redditApi.getComments('testsub', 'post1');

      expect(global.fetch).toHaveBeenCalled();
      expect(results).toEqual([]);
    }, 10000);
  });
});
