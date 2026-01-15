import { render, screen, fireEvent } from '@testing-library/react';
import { TopicCard } from '../TopicCard';
import type { Subreddit, Post } from '@/lib/types';

/**
 * TopicCard 组件单元测试
 * 测试主题卡片的渲染和交互
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

describe('TopicCard', () => {
  const mockOnToggleSelect = jest.fn();

  beforeEach(() => {
    mockOnToggleSelect.mockClear();
  });

  /**
   * 测试：渲染 Subreddit 卡片
   */
  it('应该渲染 Subreddit 卡片', () => {
    render(
      <TopicCard
        topic={mockSubreddit}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    expect(screen.getByText('社区')).toBeInTheDocument();
    expect(screen.getByText('Test Subreddit')).toBeInTheDocument();
    // 1000 should be formatted as 1K
    expect(screen.getByText(/1K/)).toBeInTheDocument();
    expect(screen.getByText('A test subreddit for testing')).toBeInTheDocument();
  });

  /**
   * 测试：渲染 Post 卡片
   */
  it('应该渲染 Post 卡片', () => {
    render(
      <TopicCard
        topic={mockPost}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    expect(screen.getByText('帖子')).toBeInTheDocument();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    // Use regex for partial match as timestamp changes
    expect(screen.getByText(/100 点赞 · 10 评论/)).toBeInTheDocument();
  });

  /**
   * 测试：选中状态
   */
  it('应该显示选中状态', () => {
    render(
      <TopicCard
        topic={mockSubreddit}
        isSelected={true}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('ring-2', 'ring-blue-500');
  });

  /**
   * 测试：点击卡片触发选择
   */
  it('应该调用 onToggleSelect 当点击卡片时', () => {
    render(
      <TopicCard
        topic={mockSubreddit}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(mockOnToggleSelect).toHaveBeenCalled();
  });

  /**
   * 测试：点击复选框触发选择
   */
  it('应该调用 onToggleSelect 当点击复选框时', () => {
    render(
      <TopicCard
        topic={mockSubreddit}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockOnToggleSelect).toHaveBeenCalled();
  });

  /**
   * 测试：点击链接不触发选择
   */
  it('点击链接不应该触发选择', () => {
    render(
      <TopicCard
        topic={mockSubreddit}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    const link = screen.getByText('查看详情');
    fireEvent.click(link);
    
    expect(mockOnToggleSelect).not.toHaveBeenCalled();
  });

  /**
   * 测试：键盘导航
   */
  it('应该支持键盘导航', () => {
    const { rerender } = render(
      <TopicCard
        topic={mockSubreddit}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    
    const card = screen.getByRole('button');
    
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnToggleSelect).toHaveBeenCalledTimes(1);
    
    // Re-render with selected state to verify visual feedback
    rerender(
      <TopicCard
        topic={mockSubreddit}
        isSelected={true}
        onToggleSelect={mockOnToggleSelect}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
    
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnToggleSelect).toHaveBeenCalledTimes(2);
  });
});
