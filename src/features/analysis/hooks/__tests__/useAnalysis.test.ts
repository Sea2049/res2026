import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalysis } from '../useAnalysis';
import { redditApi } from '@/lib/api/reddit';
import type { SearchResult, Comment } from '@/lib/types';

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

const mockPost: SearchResult = {
  id: 'test-post-1',
  title: 'Test Post',
  selftext: 'Test content',
  author: 'testuser',
  subreddit: 'testsub',
  score: 100,
  num_comments: 10,
  created_utc: Date.now() / 1000,
  url: 'https://reddit.com/test',
  type: 'post',
};

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    body: 'This is a great post',
    author: 'user1',
    score: 10,
    created_utc: Date.now() / 1000,
    parent_id: 'test-post-1',
  },
  {
    id: 'comment-2',
    body: 'I disagree with this',
    author: 'user2',
    score: 5,
    created_utc: Date.now() / 1000,
    parent_id: 'test-post-1',
  },
];

describe('useAnalysis Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redditApi.getComments as jest.Mock).mockResolvedValue(mockComments);
  });

  it('应该返回正确的初始状态', () => {
    const { result } = renderHook(() => useAnalysis());

    expect(result.current.session).toBeNull();
    expect(result.current.errorInfo).toBeNull();
  });

  it('应该成功开始分析', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([mockPost]);
    });

    await waitFor(() => {
      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.status).toBe('completed');
    });
  });

  it('应该正确处理空主题列表', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([]);
    });

    expect(result.current.errorInfo).not.toBeNull();
    expect(result.current.errorInfo?.type).toBe('INVALID_INPUT');
  });

  it('应该能够取消分析', async () => {
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.startAnalysis([mockPost]);
    });

    act(() => {
      result.current.cancelAnalysis();
    });

    await waitFor(() => {
      expect(result.current.session?.status).not.toBe('analyzing');
    });
  });

  it('应该能够重置分析状态', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([mockPost]);
    });

    act(() => {
      result.current.resetAnalysis();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.errorInfo).toBeNull();
  });

  it('应该正确处理 API 错误', async () => {
    (redditApi.getComments as jest.Mock).mockRejectedValue(
      new Error('API 请求失败: 429')
    );

    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([mockPost]);
    });

    await waitFor(() => {
      expect(result.current.errorInfo).not.toBeNull();
    });
  });

  it('应该能够导出 JSON 格式结果', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([mockPost]);
    });

    await waitFor(() => {
      expect(result.current.session?.status).toBe('completed');
    });

    const exported = result.current.exportResult('json');
    expect(exported).not.toBeNull();
    expect(() => JSON.parse(exported!)).not.toThrow();
  });

  it('应该能够导出 CSV 格式结果', async () => {
    const { result } = renderHook(() => useAnalysis());

    await act(async () => {
      await result.current.startAnalysis([mockPost]);
    });

    await waitFor(() => {
      expect(result.current.session?.status).toBe('completed');
    });

    const exported = result.current.exportResult('csv');
    expect(exported).not.toBeNull();
    if (exported) {
      expect(exported).toContain('关键词');
    }
  });

  it('未完成分析时导出应返回 null', () => {
    const { result } = renderHook(() => useAnalysis());

    const exported = result.current.exportResult('json');
    expect(exported).toBeNull();
  });
});
