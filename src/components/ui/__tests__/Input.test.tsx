import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input 组件', () => {
  it('应该渲染输入框', () => {
    render(<Input placeholder="请输入" />);
    expect(screen.getByPlaceholderText('请输入')).toBeInTheDocument();
  });

  it('应该应用默认样式', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('h-10');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveClass('border-gray-300');
  });

  it('应该应用错误状态样式', () => {
    render(<Input error />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('应该应用禁用状态', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('应该支持多种输入类型', () => {
    render(<Input type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('应该输入时触发 onChange 事件', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '测试文本' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('应该显示输入值', () => {
    render(<Input value="初始值" readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('初始值');
  });

  it('应该应用聚焦样式', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus:ring-2');
    expect(input).toHaveClass('focus:ring-blue-500');
  });

  it('应该应用自定义类名', () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  it('应该传递所有 HTML 属性', () => {
    render(<Input data-testid="test-input" maxLength={100} />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('maxLength', '100');
  });

  it('应该显示占位符文本', () => {
    render(<Input placeholder="占位符" />);
    expect(screen.getByPlaceholderText('占位符')).toBeInTheDocument();
  });

  it('应该支持 name 属性', () => {
    render(<Input name="username" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'username');
  });

  it('应该支持 required 属性', () => {
    render(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });
});
