import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalysis } from '@/features/analysis/hooks/useAnalysis';
import { useTopicSearch } from '@/features/topic-selection/hooks/useTopicSearch';
import { redditApi } from '@/lib/api/reddit';
import type { SearchResult, Comment } from '@/lib/types';

// Mock 外部依赖
jest.mock('@/lib/api/reddit');
jest.mock('@/lib/workers/worker-manager', () => ({
  getNLPWorkerManager: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue({
      keywords: [{ word: 'test', count: 5, score: 0.8 }],
      sentiments: { positive: 10, negative: 5, neutral: 5 },
      insights: [],
    }),
    cancel: jest.fn(),
    terminate: jest.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

/**
 * 用户流程集成测试
 * 
 * 测试完整的用户流程：
 * 1. 搜索 Subreddit
 * 2. 选择话题
 * 3. 开始分析
 * 4. 查看分析结果
 */

// Mock 数据
const mockSubreddits = [
  {
    id: 'sub1',
    display_name: 'javascript',
    title: 'JavaScript Programming',
    description: 'A community for JavaScript developers',
    subscriber_count: 500000,
    type: 'subreddit' as const,
  },
  {
    id: 'sub2',
    display_name: 'reactjs',
    title: 'React JS',
    description: 'A community for React developers',
    subscriber_count: 300000,
    type: 'subreddit' as const,
  },
];

const mockPosts: SearchResult[] = [
  {
    id: 'post1',
    title: 'How to use React Hooks?',
    selftext: 'I am learning React Hooks...',
    author: 'developer1',
    subreddit: 'reactjs',
    score: 150,
    num_comments: 25,
    created_utc: Date.now() / 1000,
    url: 'https://reddit.com/r/reactjs/comments/post1',
    type: 'post',
  },
];

const mockComments: Comment[] = [
  {
    id: 'comment1',
    body: 'Great question! You should start with useState and useEffect.',
    author: 'expert1',
    score: 50,
    created_utc: Date.now() / 1000,
    parent_id: 'post1',
  },
  {
    id: 'comment2',
    body: 'I recommend checking the official documentation.',
    author: 'helper1',
    score: 30,
    created_utc: Date.now() / 1000,
    parent_id: 'post1',
  },
];

describe('用户流程集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Reddit API
    (redditApi.searchSubreddits as jest.Mock).mockResolvedValue(mockSubreddits);
    (redditApi.searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    (redditApi.getComments as jest.Mock).mockResolvedValue(mockComments);
    
    // Mock localStorage
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockReturnValue(undefined);
    localStorageMock.removeItem.mockReturnValue(undefined);
  });

  describe('流程1: 搜索和选择话题', () => {
    it('应该能够搜索 Subreddit 并选择话题', async () => {
      // 1. 渲染话题搜索 Hook
      const { result: searchResult } = renderHook(() => useTopicSearch());

      // 2. 搜索 Subreddit
      await act(async () => {
        await searchResult.current.search('react');
      });

      // 3. 验证搜索结果
      await waitFor(() => {
        expect(searchResult.current.results).toHaveLength(2);
        expect(searchResult.current.results[0].display_name).toBe('javascript');
        expect(searchResult.current.results[1].display_name).toBe('reactjs');
      });

      // 4. 选择话题
      act(() => {
        searchResult.current.toggleSelectTopic(mockSubreddits[1]);
      });

      // 5. 验证选择状态
      expect(searchResult.current.selectedTopics).toHaveLength(1);
      expect(searchResult.current.selectedTopics[0].display_name).toBe('reactjs');
    });

    it('应该能够取消选择话题', async () => {
      const { result: searchResult } = renderHook(() => useTopicSearch());

      // 搜索并选择话题
      await act(async () => {
        await searchResult.current.search();
      });

      act(() => {
        searchResult.current.toggleSelectTopic(mockSubreddits[0]);
        searchResult.current.toggleSelectTopic(mockSubreddits[1]);
      });

      // 取消选择一个话题
      act(() => {
        searchResult.current.toggleSelectTopic(mockSubreddits[0]);
      });

      expect(searchResult.current.selectedTopics).toHaveLength(1);
    });

    it('应该能够清空搜索和选择', async () => {
      const { result: searchResult } = renderHook(() => useTopicSearch());

      // 搜索并选择话题
      await act(async () => {
        await searchResult.current.search();
      });

      act(() => {
        searchResult.current.toggleSelectTopic(mockSubreddits[0]);
        searchResult.current.toggleSelectTopic(mockSubreddits[1]);
      });

      // 清空
      act(() => {
        searchResult.current.clearResults();
        searchResult.current.clearSelectedTopics();
      });

      expect(searchResult.current.results).toEqual([]);
      expect(searchResult.current.selectedTopics).toEqual([]);
    });
  });

  describe('流程2: 分析单个话题', () => {
    it('应该能够对帖子进行完整的分析流程', async () => {
      // 1. 渲染分析 Hook
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 2. 开始分析
      await act(async () => {
        await analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      // 3. 等待分析完成
      await waitFor(
        () => {
          expect(analysisResult.current.session?.status).toBe('completed');
        },
        { timeout: 10000 }
      );

      // 4. 验证分析结果
      expect(analysisResult.current.session?.result).not.toBeNull();
      expect(analysisResult.current.session?.result?.keywords).toHaveLength(1);
      expect(analysisResult.current.session?.result?.keywords[0].word).toBe('test');
    });

    it('应该能够取消分析', async () => {
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 开始分析
      act(() => {
        analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      // 取消分析
      act(() => {
        analysisResult.current.cancelAnalysis();
      });

      // 验证分析已取消
      await waitFor(() => {
        expect(analysisResult.current.session?.status).not.toBe('analyzing');
      });
    });

    it('应该能够重置分析状态', async () => {
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 执行分析
      await act(async () => {
        await analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      // 重置
      act(() => {
        analysisResult.current.resetAnalysis();
      });

      expect(analysisResult.current.session).toBeNull();
      expect(analysisResult.current.errorInfo).toBeNull();
    });
  });

  describe('流程3: 错误处理', () => {
    it('应该正确处理 API 错误', async () => {
      // Mock API 错误
      (redditApi.getComments as jest.Mock).mockRejectedValue(
        new Error('API 请求失败: 429')
      );

      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 尝试分析
      await act(async () => {
        await analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      // 验证错误处理
      await waitFor(() => {
        expect(analysisResult.current.errorInfo).not.toBeNull();
      });
    });

    it('应该正确处理空主题列表', async () => {
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 尝试用空列表分析
      await act(async () => {
        await analysisResult.current.startAnalysis([]);
      });

      // 验证错误
      expect(analysisResult.current.errorInfo).not.toBeNull();
    });
  });

  describe('流程4: 结果导出', () => {
    it('应该能够导出 JSON 格式结果', async () => {
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 执行分析
      await act(async () => {
        await analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      await waitFor(() => {
        expect(analysisResult.current.session?.status).toBe('completed');
      });

      // 导出 JSON
      const jsonExport = analysisResult.current.exportResult('json');
      expect(jsonExport).not.toBeNull();
      expect(() => JSON.parse(jsonExport!)).not.toThrow();
    });

    it('应该能够导出 CSV 格式结果', async () => {
      const { result: analysisResult } = renderHook(() => useAnalysis());

      // 执行分析
      await act(async () => {
        await analysisResult.current.startAnalysis([mockPosts[0]]);
      });

      await waitFor(() => {
        expect(analysisResult.current.session?.status).toBe('completed');
      });

      // 导出 CSV
      const csvExport = analysisResult.current.exportResult('csv');
      expect(csvExport).not.toBeNull();
      expect(csvExport).toContain('关键词');
    });
  });

  describe('流程5: 组合流程', () => {
    it('应该能够完整执行搜索->选择->分析流程', async () => {
      // 1. 搜索
      const { result: searchResult } = renderHook(() => useTopicSearch());
      
      await act(async () => {
        await searchResult.current.search();
      });

      // 2. 选择
      act(() => {
        searchResult.current.toggleSelectTopic(mockSubreddits[1]);
      });

      // 3. 转换为帖子格式进行分析
      const topicsForAnalysis: SearchResult[] = [{
        id: mockSubreddits[1].id,
        title: mockSubreddits[1].title,
        selftext: mockSubreddits[1].description,
        author: 'system',
        subreddit: mockSubreddits[1].display_name,
        score: 0,
        num_comments: 0,
        created_utc: Date.now() / 1000,
        url: `https://reddit.com/r/${mockSubreddits[1].display_name}`,
        type: 'post' as const,
      }];

      // 4. 分析
      const { result: analysisResult } = renderHook(() => useAnalysis());
      
      await act(async () => {
        await analysisResult.current.startAnalysis(topicsForAnalysis);
      });

      // 5. 验证结果
      await waitFor(() => {
        expect(analysisResult.current.session?.status).toBe('completed');
      });

      // 6. 导出结果
      const jsonExport = analysisResult.current.exportResult('json');
      expect(jsonExport).not.toBeNull();

      // 7. 重置
      act(() => {
        analysisResult.current.resetAnalysis();
        searchResult.current.clearResults();
        searchResult.current.clearSelectedTopics();
      });

      expect(analysisResult.current.session).toBeNull();
      expect(searchResult.current.results).toEqual([]);
    });
  });
});
