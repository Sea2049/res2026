import { render, screen } from '@testing-library/react';
import { AnalysisProgress } from '../AnalysisProgress';
import type { AnalysisSession } from '@/lib/types';

const createMockSession = (
  status: AnalysisSession['status'],
  progress: number = 0
): AnalysisSession => ({
  id: 'test-session',
  topics: [],
  status,
  progress,
  currentStep: '',
  createdAt: Date.now(),
  result: null,
  error: null,
});

describe('AnalysisProgress 组件', () => {
  it('应该渲染空闲状态', () => {
    const session = createMockSession('idle');
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('分析进度')).toBeInTheDocument();
    const prepareElements = screen.getAllByText('准备开始');
    expect(prepareElements.length).toBeGreaterThan(0);
  });

  it('应该渲染获取数据状态', () => {
    const session = createMockSession('fetching', 30);
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('正在获取数据')).toBeInTheDocument();
    const percentageElements = screen.getAllByText('30%');
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  it('应该渲染分析中状态', () => {
    const session = createMockSession('analyzing', 70);
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('正在分析')).toBeInTheDocument();
    const percentageElements = screen.getAllByText('70%');
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  it('应该渲染完成状态', () => {
    const session: AnalysisSession = {
      ...createMockSession('completed', 100),
      result: {
        comments: [{
          id: '1',
          body: 'test',
          author: 'user',
          score: 1,
          created_utc: Date.now() / 1000,
          parent_id: 'post1',
        }],
        keywords: [],
        sentiments: { positive: 0, negative: 0, neutral: 1 },
        insights: [],
      },
    };
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('分析完成')).toBeInTheDocument();
    expect(screen.getByText(/共处理 1 条评论/)).toBeInTheDocument();
  });

  it('应该渲染错误状态', () => {
    const session: AnalysisSession = {
      ...createMockSession('error', 50),
      error: '网络连接失败',
    };
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('发生错误')).toBeInTheDocument();
    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
  });

  it('应该显示取消按钮在进行中状态', () => {
    const session = createMockSession('analyzing', 50);
    const onCancel = jest.fn();
    render(<AnalysisProgress session={session} onCancel={onCancel} />);

    const cancelButton = screen.getByText('取消分析');
    expect(cancelButton).toBeInTheDocument();
  });

  it('应该显示当前步骤信息', () => {
    const session: AnalysisSession = {
      ...createMockSession('analyzing', 60),
      currentStep: '正在提取关键词',
    };
    render(<AnalysisProgress session={session} />);

    expect(screen.getByText('正在提取关键词')).toBeInTheDocument();
  });

  it('应该正确显示进度条颜色', () => {
    const { container: container1 } = render(
      <AnalysisProgress session={createMockSession('analyzing', 50)} />
    );
    expect(container1.querySelector('.bg-blue-500')).toBeInTheDocument();

    const { container: container2 } = render(
      <AnalysisProgress session={createMockSession('completed', 100)} />
    );
    expect(container2.querySelector('.bg-green-500')).toBeInTheDocument();

    const { container: container3 } = render(
      <AnalysisProgress session={{ ...createMockSession('error', 50), error: 'test' }} />
    );
    expect(container3.querySelector('.bg-red-500')).toBeInTheDocument();
  });
});
