import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button 组件', () => {
  it('应该渲染按钮文本', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument();
  });

  it('应该应用默认变体样式', () => {
    render(<Button>默认按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100');
  });

  it('应该应用 primary 变体样式', () => {
    render(<Button variant="primary">主要按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-reddit-orange');
  });

  it('应该应用 secondary 变体样式', () => {
    render(<Button variant="secondary">次要按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-600');
  });

  it('应该应用 ghost 变体样式', () => {
    render(<Button variant="ghost">幽灵按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('应该应用 destructive 变体样式', () => {
    render(<Button variant="destructive">危险按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('应该应用 sm 尺寸样式', () => {
    render(<Button size="sm">小按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3');
  });

  it('应该应用 lg 尺寸样式', () => {
    render(<Button size="lg">大按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6');
  });

  it('应该禁用按钮当 disabled 为 true', () => {
    render(<Button disabled>禁用按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:cursor-not-allowed');
  });

  it('应该显示加载状态', () => {
    render(<Button loading>加载中</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByRole('button')).toContainHTML('<svg');
  });

  it('应该全宽显示当 fullWidth 为 true', () => {
    render(<Button fullWidth>全宽按钮</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('应该点击时触发 onClick 事件', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>可点击</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('应该禁用时不触发 onClick 事件', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>禁用点击</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('应该应用自定义类名', () => {
    render(<Button className="custom-class">自定义</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('应该传递所有 HTML 属性', () => {
    render(<Button data-testid="test-button" aria-label="测试">属性</Button>);
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('aria-label', '测试');
  });
});
