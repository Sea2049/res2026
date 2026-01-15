import { renderHook, act, waitFor } from '@testing-library/react';
import { useTopicSearch } from '../useTopicSearch';
import type { Subreddit, Post } from '@/lib/types';
import { redditApi } from '@/lib/api/reddit';

// Mock redditApi
jest.mock('@/lib/api/reddit', () => ({
  redditApi: {
    searchSubreddits: jest.fn(),
    searchPosts: jest.fn(),
  },
}));

/**
 * useTopicSearch Hook 单元测试
 * 测试搜索状态管理功能
 */

const mockSubreddit: Subreddit = {
  id: 'test-subreddit-1',
  name: 'testsub',
  display_name: 'Test Subreddit',
  title: 'Test Subreddit',
  description: 'A test subreddit for testing',
  subscriber_count: 1000,
  url: '/r/testsub',
};

const mockPost: Post = {
  id: 'test-post-1',
  title: 'Test Post',
  selftext: 'This is a test post',
  author: 'testuser',
  subreddit: 'testsub',
  score: 100,
  num_comments: 10,
  created_utc: Date.now() / 1000,
  url: 'https://reddit.com/r/testsub/comments/test-post-1',
};

describe('useTopicSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 测试：初始状态
   */
  it('应该返回正确的初始状态', () => {
    const { result } = renderHook(() => useTopicSearch());
    
    expect(result.current.keyword).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedTopicIds).toEqual(new Set());
    expect(result.current.selectedTopics).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * 测试：设置搜索关键词
   */
  it('应该设置搜索关键词', () => {
    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('javascript');
    });
    
    expect(result.current.keyword).toBe('javascript');
  });

  /**
   * 测试：切换主题选择状态
   */
  it('应该切换主题选择状态', async () => {
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockSubreddit]);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue([mockPost]);

    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('test');
    });

    await act(async () => {
      await result.current.search();
    });
    
    act(() => {
      result.current.toggleSelectTopic(mockSubreddit);
    });
    
    expect(result.current.selectedTopicIds.has(mockSubreddit.id)).toBe(true);
    expect(result.current.selectedTopics).toContainEqual(mockSubreddit);
  });

  /**
   * 测试：取消选择主题
   */
  it('应该取消选择主题', async () => {
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockSubreddit]);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue([mockPost]);

    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('test');
    });

    await act(async () => {
      await result.current.search();
    });
    
    act(() => {
      result.current.toggleSelectTopic(mockSubreddit);
      result.current.toggleSelectTopic(mockSubreddit);
    });
    
    expect(result.current.selectedTopicIds.has(mockSubreddit.id)).toBe(false);
    expect(result.current.selectedTopics).not.toContainEqual(mockSubreddit);
  });

  /**
   * 测试：清空搜索结果
   */
  it('应该清空搜索结果', async () => {
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockSubreddit]);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue([mockPost]);

    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('test');
    });

    await act(async () => {
      await result.current.search();
    });
    
    expect(result.current.results.length).toBe(2);
    
    act(() => {
      result.current.clearResults();
    });
    
    expect(result.current.results).toEqual([]);
  });

  /**
   * 测试：清空已选主题
   */
  it('应该清空已选主题', async () => {
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockSubreddit]);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue([mockPost]);

    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('test');
    });

    await act(async () => {
      await result.current.search();
    });
    
    act(() => {
      result.current.toggleSelectTopic(mockSubreddit);
    });
    
    expect(result.current.selectedTopicIds.size).toBe(1);
    
    act(() => {
      result.current.clearSelectedTopics();
    });
    
    expect(result.current.selectedTopicIds.size).toBe(0);
  });

  /**
   * 测试：计算已选主题列表
   */
  it('应该正确计算已选主题列表', async () => {
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockSubreddit]);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue([mockPost]);

    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('test');
    });

    await act(async () => {
      await result.current.search();
    });

    act(() => {
      result.current.toggleSelectTopic(mockSubreddit);
    });
    
    expect(result.current.selectedTopics).toEqual([mockSubreddit]);
  });

  /**
   * 测试：无效关键词应该设置错误
   */
  it('无效关键词应该设置错误', async () => {
    const { result } = renderHook(() => useTopicSearch());
    
    act(() => {
      result.current.setKeyword('');
    });
    
    await act(async () => {
      await result.current.search();
    });
    
    expect(result.current.error).toBe('请输入有效的搜索关键词');
  });
});
