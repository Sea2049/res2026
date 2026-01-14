import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '../useSearchHistory';

/**
 * useSearchHistory Hook 单元测试
 * 测试搜索历史记录的功能
 */

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * 测试：初始状态应该为空数组
   */
  it('应该返回空的初始历史记录', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual([]);
    expect(result.current.addToHistory).toBeDefined();
    expect(result.current.clearHistory).toBeDefined();
    expect(result.current.removeFromHistory).toBeDefined();
  });

  /**
   * 测试：添加搜索记录到历史
   */
  it('应该添加搜索记录到历史', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('javascript');
    });
    
    expect(result.current.history).toEqual(['javascript']);
    expect(localStorage.getItem('reddit_search_history')).toBe(JSON.stringify(['javascript']));
  });

  /**
   * 测试：添加多个搜索记录
   */
  it('应该添加多个搜索记录并限制数量', () => {
    const { result } = renderHook(() => useSearchHistory(3));
    
    act(() => {
      result.current.addToHistory('javascript');
      result.current.addToHistory('python');
      result.current.addToHistory('gaming');
      result.current.addToHistory('cooking');
    });
    
    expect(result.current.history).toEqual(['cooking', 'gaming', 'javascript']);
    expect(result.current.history.length).toBe(3);
  });

  /**
   * 测试：添加重复的关键词应该移动到前面
   */
  it('添加重复关键词应该移动到前面', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('javascript');
      result.current.addToHistory('python');
      result.current.addToHistory('javascript');
    });
    
    expect(result.current.history).toEqual(['javascript', 'python']);
    expect(result.current.history[0]).toBe('javascript');
  });

  /**
   * 测试：添加空关键词不应该添加到历史
   */
  it('不应该添加空关键词到历史', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('');
    });
    
    expect(result.current.history).toEqual([]);
    expect(localStorage.getItem('reddit_search_history')).toBeNull();
  });

  /**
   * 测试：清空历史记录
   */
  it('应该清空所有历史记录', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('javascript');
      result.current.addToHistory('python');
    });
    
    expect(result.current.history.length).toBe(2);
    
    act(() => {
      result.current.clearHistory();
    });
    
    expect(result.current.history).toEqual([]);
    expect(localStorage.getItem('reddit_search_history')).toBeNull();
  });

  /**
   * 测试：删除指定的历史记录
   */
  it('应该删除指定的历史记录', () => {
    const { result } = renderHook(() => useSearchHistory());
    
    act(() => {
      result.current.addToHistory('javascript');
      result.current.addToHistory('python');
      result.current.addToHistory('gaming');
    });
    
    expect(result.current.history).toEqual(['javascript', 'python', 'gaming']);
    
    act(() => {
      result.current.removeFromHistory('python');
    });
    
    expect(result.current.history).toEqual(['javascript', 'gaming']);
    expect(result.current.history).not.toContain('python');
  });

  /**
   * 测试：从 localStorage 加载历史记录
   */
  it('应该从 localStorage 加载历史记录', () => {
    localStorage.setItem('reddit_search_history', JSON.stringify(['javascript', 'python']));
    
    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual(['javascript', 'python']);
  });

  /**
   * 测试：处理无效的 localStorage 数据
   */
  it('应该处理无效的 localStorage 数据', () => {
    localStorage.setItem('reddit_search_history', 'invalid json');
    
    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual([]);
  });
});
