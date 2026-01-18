import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../card';

describe('Card 组件', () => {
  it('应该渲染 Card 容器', () => {
    render(<Card>卡片内容</Card>);
    expect(screen.getByText('卡片内容')).toBeInTheDocument();
  });

  it('应该应用默认样式', () => {
    render(<Card data-testid="test-card">内容</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-white');
  });

  it('应该应用阴影样式', () => {
    render(<Card className="shadow-md" data-testid="test-card">内容</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('shadow-md');
  });

  it('应该渲染 CardHeader', () => {
    render(
      <Card>
        <CardHeader>头部</CardHeader>
      </Card>
    );
    expect(screen.getByText('头部')).toBeInTheDocument();
  });

  it('应该渲染 CardTitle', () => {
    render(
      <Card>
        <CardTitle>标题</CardTitle>
      </Card>
    );
    const title = screen.getByText('标题');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-semibold');
  });

  it('应该渲染 CardContent', () => {
    render(
      <Card>
        <CardContent>内容</CardContent>
      </Card>
    );
    expect(screen.getByText('内容')).toBeInTheDocument();
  });

  it('应该渲染 CardFooter', () => {
    render(
      <Card>
        <CardFooter>底部</CardFooter>
      </Card>
    );
    expect(screen.getByText('底部')).toBeInTheDocument();
  });

  it('应该组合渲染完整卡片', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>完整卡片</CardTitle>
        </CardHeader>
        <CardContent>卡片内容</CardContent>
        <CardFooter>卡片底部</CardFooter>
      </Card>
    );
    expect(screen.getByText('完整卡片')).toBeInTheDocument();
    expect(screen.getByText('卡片内容')).toBeInTheDocument();
    expect(screen.getByText('卡片底部')).toBeInTheDocument();
  });

  it('应该应用自定义类名到 Card', () => {
    render(<Card className="custom-card">内容</Card>);
    const card = screen.getByText('内容').closest('div');
    expect(card).toHaveClass('custom-card');
  });

  it('应该应用自定义类名到 CardHeader', () => {
    render(
      <Card>
        <CardHeader className="custom-header">头部</CardHeader>
      </Card>
    );
    const header = screen.getByText('头部').closest('div');
    expect(header).toHaveClass('custom-header');
  });

  it('应该应用自定义类名到 CardContent', () => {
    render(
      <Card>
        <CardContent className="custom-content">内容</CardContent>
      </Card>
    );
    const content = screen.getByText('内容').closest('div');
    expect(content).toHaveClass('custom-content');
  });

  it('应该应用自定义类名到 CardFooter', () => {
    render(
      <Card>
        <CardFooter className="custom-footer">底部</CardFooter>
      </Card>
    );
    const footer = screen.getByText('底部').closest('div');
    expect(footer).toHaveClass('custom-footer');
  });
});
