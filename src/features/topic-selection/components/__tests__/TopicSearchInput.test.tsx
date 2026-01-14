import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopicSearchInput } from '../TopicSearchInput';

/**
 * TopicSearchInput 组件单元测试
 * 测试搜索输入框的功能
 */

describe('TopicSearchInput', () => {
  const mockOnSearch = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnHistoryClick = jest.fn();
  const mockOnClearHistory = jest.fn();
  const mockOnRemoveHistory = jest.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onSearch: mockOnSearch,
    isLoading: false,
    searchHistory: [],
    onHistoryClick: mockOnHistoryClick,
    onClearHistory: mockOnClearHistory,
    onRemoveHistory: mockOnRemoveHistory,
  };

  /**
   * 测试：渲染搜索输入框
   */
  it('应该渲染搜索输入框和按钮', () => {
    render(<TopicSearchInput {...defaultProps} />);
    
    expect(screen.getByLabelText('搜索输入框')).toBeInTheDocument();
    expect(screen.getByLabelText('搜索按钮')).toBeInTheDocument();
  });

  /**
   * 测试：显示占位符文本
   */
  it('应该显示正确的占位符文本', () => {
    const customPlaceholder = '自定义占位符';
    render(<TopicSearchInput {...defaultProps} placeholder={customPlaceholder} />);
    
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });

  /**
   * 测试：输入值变化
   */
  it('应该调用 onChange 当输入值变化时', () => {
    render(<TopicSearchInput {...defaultProps} />);
    
    const input = screen.getByLabelText('搜索输入框');
    fireEvent.change(input, { target: { value: 'javascript' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('javascript');
  });

  /**
   * 测试：点击搜索按钮
   */
  it('应该调用 onSearch 当点击搜索按钮时', () => {
    render(<TopicSearchInput {...defaultProps} value='test' />);
    
    const searchButton = screen.getByLabelText('搜索按钮');
    fireEvent.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  /**
   * 测试：按回车键搜索
   */
  it('应该调用 onSearch 当按回车键时', () => {
    render(<TopicSearchInput {...defaultProps} value='test' />);
    
    const input = screen.getByLabelText('搜索输入框');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  /**
   * 测试：显示搜索历史记录
   */
  it('应该显示搜索历史记录', () => {
    const history = ['javascript', 'python', 'gaming'];
    render(<TopicSearchInput {...defaultProps} searchHistory={history} />);
    
    expect(screen.getByText('搜索历史')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('gaming')).toBeInTheDocument();
  });

  /**
   * 测试：点击历史记录项
   */
  it('应该调用 onHistoryClick 当点击历史记录项时', () => {
    const history = ['javascript'];
    render(<TopicSearchInput {...defaultProps} searchHistory={history} />);
    
    const historyItem = screen.getByText('javascript');
    fireEvent.click(historyItem);
    
    expect(mockOnHistoryClick).toHaveBeenCalledWith('javascript');
  });

  /**
   * 测试：删除历史记录项
   */
  it('应该调用 onRemoveHistory 当点击删除按钮时', () => {
    const history = ['javascript'];
    render(<TopicSearchInput {...defaultProps} searchHistory={history} />);
    
    const deleteButton = screen.getAllByRole('button')[1];
    fireEvent.click(deleteButton);
    
    expect(mockOnRemoveHistory).toHaveBeenCalledWith('javascript');
  });

  /**
   * 测试：清空历史记录
   */
  it('应该调用 onClearHistory 当点击清空按钮时', () => {
    const history = ['javascript'];
    render(<TopicSearchInput {...defaultProps} searchHistory={history} />);
    
    const clearButton = screen.getByText('清空');
    fireEvent.click(clearButton);
    
    expect(mockOnClearHistory).toHaveBeenCalled();
  });

  /**
   * 测试：显示错误信息
   */
  it('应该显示错误信息当输入为空时', () => {
    render(<TopicSearchInput {...defaultProps} value='' />);
    
    const searchButton = screen.getByLabelText('搜索按钮');
    fireEvent.click(searchButton);
    
    expect(screen.getByText('请输入搜索关键词')).toBeInTheDocument();
  });

  /**
   * 测试：禁用搜索按钮当输入为空时
   */
  it('应该禁用搜索按钮当输入为空时', () => {
    render(<TopicSearchInput {...defaultProps} value='' />);
    
    const searchButton = screen.getByLabelText('搜索按钮');
    expect(searchButton).toBeDisabled();
  });

  /**
   * 测试：显示加载状态
   */
  it('应该显示加载状态', () => {
    render(<TopicSearchInput {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('搜索中...')).toBeInTheDocument();
    expect(screen.getByLabelText('搜索按钮')).toBeDisabled();
  });

  /**
   * 测试：限制输入长度
   */
  it('应该限制输入长度为 100 字符', () => {
    render(<TopicSearchInput {...defaultProps} />);
    
    const input = screen.getByLabelText('搜索输入框');
    const longText = 'a'.repeat(101);
    
    fireEvent.change(input, { target: { value: longText } });
    
    expect(screen.getByText('关键词长度不能超过 100 个字符')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalledWith(longText);
  });
});
