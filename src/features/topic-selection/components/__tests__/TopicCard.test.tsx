import { render, screen, fireEvent } from '@testing-library/react';
import { TopicCard } from '../TopicCard';
import type { Subreddit, Post } from '@/lib/types';

/**
 * TopicCard 组件单元测试
 * 测试主题卡片的功能
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
  /**
   * 测试：渲染 Subreddit 卡片
   */
  it('应该渲染 Subreddit 卡片', () => {
    render(<TopicCard topic={mockSubreddit} />);
    
    expect(screen.getByText('社区')).toBeInTheDocument();
    expect(screen.getByText('Test Subreddit')).toBeInTheDocument();
    expect(screen.getByText('1K')).toBeInTheDocument();
    expect(screen.getByText('A test subreddit for testing')).toBeInTheDocument();
  });

  /**
   * 测试：渲染 Post 卡片
   */
  it('应该渲染 Post 卡片', () => {
    render(<TopicCard topic={mockPost} />);
    
    expect(screen.getByText('帖子')).toBeInTheDocument();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('100 点赞 · 10 评论')).toBeInTheDocument();
  });

  /**
   * 测试：未选中状态
   */
  it('应该显示未选中状态', () => {
    render(<TopicCard topic={mockSubreddit} isSelected={false} />);
    
    const card = screen.getByRole('button');
    expect(card).not.toHaveClass('ring-2');
    expect(card).not.toHaveClass('bg-blue-50');
  });

  /**
   * 测试：选中状态
   */
  it('应该显示选中状态', () => {
    render(<TopicCard topic={mockSubreddit} isSelected={true} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('bg-blue-50');
  });

  /**
   * 测试：点击卡片切换选择状态
   */
  it('应该调用 onToggleSelect 当点击卡片时', () => {
    const mockOnToggleSelect = jest.fn();
    render(<TopicCard topic={mockSubreddit} onToggleSelect={mockOnToggleSelect} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(mockOnToggleSelect).toHaveBeenCalledWith(mockSubreddit);
  });

  /**
   * 测试：显示查看详情链接
   */
  it('应该显示查看详情链接', () => {
    render(<TopicCard topic={mockSubreddit} />);
    
    const link = screen.getByText('查看详情');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://www.reddit.com/r/testsub');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  /**
   * 测试：键盘导航
   */
  it('应该支持键盘导航', () => {
    render(<TopicCard topic={mockSubreddit} />);
    
    const card = screen.getByRole('button');
    
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByRole('checkbox')).toBeChecked();
    
    fireEvent.keyDown(card, { key: ' ' });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  /**
   * 测试：复选框状态
   */
  it('应该正确显示复选框状态', () => {
    const { rerender } = render(<TopicCard topic={mockSubreddit} isSelected={false} />);
    
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    
    rerender(<TopicCard topic={mockSubreddit} isSelected={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  /**
   * 测试：XSS 防护
   */
  it('应该转义 HTML 特殊字符', () => {
    const maliciousSubreddit = {
      ...mockSubreddit,
      title: '<script>alert("xss")</script>',
      description: '<img src=x onerror=alert(1)>',
    };
    
    render(<TopicCard topic={maliciousSubreddit} />);
    
    expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    expect(screen.queryByText('<img>')).not.toBeInTheDocument();
  });
});
