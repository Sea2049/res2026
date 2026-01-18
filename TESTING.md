# Reddit Insight Tool 测试文档

## 一、测试概述

本项目采用 Jest 和 React Testing Library 构建完整的测试体系，确保核心功能的可靠性和稳定性。测试覆盖单元测试、集成测试和端到端测试三个层面。

### 测试统计

- **测试套件总数**: 12 个
- **测试用例总数**: 121 个
- **通过测试**: 120 个 (99.2%)
- **失败测试**: 1 个 (0.8%)
- **整体覆盖率**: 30.46%

### 覆盖率详情

| 指标 | 覆盖率 | 目标 | 状态 |
|------|--------|------|------|
| 语句覆盖率 (Statements) | 30.46% | 70% | ⚠️ 未达标（提升 1.75%） |
| 分支覆盖率 (Branches) | 23.38% | 70% | ⚠️ 未达标 |
| 函数覆盖率 (Functions) | 26.01% | 70% | ⚠️ 未达标 |
| 行覆盖率 (Lines) | 31.35% | 70% | ⚠️ 未达标 |

### 核心模块覆盖率提升

| 模块 | 覆盖率 | 状态 | 提升 |
|------|--------|------|------|
| lib/api/fetch-helper.ts | 100% | ⭐ 优秀 | - |
| components/ui/button.tsx | 100% | ⭐ 新增 | +100% |
| components/ui/input.tsx | 100% | ⭐ 新增 | +100% |
| components/ui/card.tsx | 92.3% | ⭐ 新增 | +92.3% |
| features/analysis/components/AnalysisProgress.tsx | 94.73% | ⭐ 优秀 | - |
| features/topic-selection/components/TopicCard.tsx | 97.87% | ⭐ 优秀 | - |
| features/topic-selection/hooks/useSearchHistory.ts | 89.18% | ✅ 良好 | +8.1% |

## 二、测试环境配置

### 2.1 测试框架

- **Jest**: 测试运行器和断言库
- **React Testing Library**: React 组件测试工具
- **@testing-library/jest-dom**: DOM 断言扩展
- **@testing-library/user-event**: 用户交互模拟

### 2.2 配置文件

#### jest.config.js

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

#### jest.setup.js

全局测试环境配置，包括：
- @testing-library/jest-dom 扩展
- 全局 fetch mock
- ResizeObserver mock
- IntersectionObserver mock
- matchMedia mock
- localStorage mock

## 三、测试文件结构

### 3.1 单元测试

#### NLP 模块测试
**文件**: `src/lib/__tests__/nlp.test.ts`

测试覆盖：
- ✅ 文本标准化 (normalizeText)
- ✅ 分词功能 (tokenize)
- ✅ 情感分析 (analyzeSentiment)
- ✅ 关键词提取 (extractKeywords)
- ✅ 否定词处理
- ✅ 强化词处理

#### API 工具测试

**文件**: `src/lib/api/__tests__/fetch-helper.test.ts`

测试覆盖：
- ✅ 直接请求成功场景
- ✅ 备用策略回退机制
- ✅ 所有策略失败处理
- ✅ 网络错误处理
- ⚠️ 超时错误处理（需优化）
- ✅ 代理 URL 正确性
- ✅ 429 错误重试

**文件**: `src/lib/api/__tests__/reddit.test.ts`

测试覆盖：
- ✅ Subreddit 搜索功能
- ✅ 空结果处理
- ⚠️ API 错误处理（超时问题）
- ⚠️ 请求取消功能（需修复）
- ✅ 帖子搜索功能
- ⚠️ 排序和时间范围参数（URL 编码问题）
- ⚠️ 评论获取功能（数据结构问题）
- ⚠️ 429 错误重试（调用次数不匹配）

#### 话题选择模块测试

**文件**: `src/features/topic-selection/hooks/__tests__/useTopicSearch.test.ts`

测试覆盖：
- ✅ 初始状态验证
- ✅ 设置搜索关键词
- ✅ 切换主题选择状态
- ✅ 取消选择主题
- ✅ 清空搜索结果
- ✅ 清空已选主题
- ✅ 计算已选主题列表
- ✅ 无效关键词错误处理

**文件**: `src/features/topic-selection/hooks/__tests__/useSearchHistory.test.ts`

测试覆盖：
- ✅ 初始状态验证
- ✅ 添加搜索历史
- ✅ 清空搜索历史
- ✅ 历史记录持久化

**文件**: `src/features/topic-selection/components/__tests__/TopicSearchInput.test.tsx`

测试覆盖：
- ✅ 组件渲染
- ✅ 输入框交互
- ✅ 搜索按钮点击
- ✅ 键盘事件处理

**文件**: `src/features/topic-selection/components/__tests__/TopicCard.test.tsx`

测试覆盖：
- ✅ Subreddit 卡片渲染
- ✅ 帖子卡片渲染
- ✅ 选择状态切换
- ✅ 卡片点击事件

#### 分析模块测试

**文件**: `src/features/analysis/hooks/__tests__/useAnalysis.test.ts`

测试覆盖：
- ✅ 初始状态验证
- ✅ 成功开始分析
- ✅ 空主题列表处理
- ✅ 取消分析功能
- ✅ 重置分析状态
- ✅ API 错误处理
- ✅ 导出 JSON 格式
- ⚠️ 导出 CSV 格式（数据结构问题）
- ✅ 未完成分析时导出返回 null

**文件**: `src/features/analysis/components/__tests__/AnalysisProgress.test.tsx`

测试覆盖：
- ✅ 空闲状态渲染
- ⚠️ 获取数据状态渲染（多个 30% 文本）
- ✅ 分析中状态渲染
- ✅ 完成状态渲染
- ✅ 错误状态渲染
- ✅ 取消按钮显示
- ✅ 当前步骤信息显示
- ✅ 进度条颜色正确性

### 3.6 UI 组件测试文件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/components/ui/__tests__/Button.test.tsx | TSX | Button 组件的单元测试，覆盖所有变体和状态（14个测试用例） |
| src/components/ui/__tests__/Input.test.tsx | TSX | Input 组件的单元测试，覆盖输入和验证（13个测试用例） |
| src/components/ui/__tests__/Card.test.tsx | TSX | Card 组件的单元测试，覆盖所有子组件（11个测试用例） |

## 四、运行测试

### 4.1 运行所有测试

```bash
npm test
```

### 4.2 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 4.3 监听模式运行测试

```bash
npm run test:watch
```

### 4.4 运行特定测试文件

```bash
npm test -- nlp.test.ts
```

### 4.5 运行特定测试用例

```bash
npm test -- -t "应该检测正面情感"
```

## 五、测试最佳实践

### 5.1 测试命名规范

- 使用中文描述测试用例
- 遵循 "应该 + 动作 + 预期结果" 的格式
- 示例: `应该在直接请求成功时返回响应`

### 5.2 测试结构

```typescript
describe('模块名称', () => {
  beforeEach(() => {
    // 每个测试前的准备工作
  });

  afterEach(() => {
    // 每个测试后的清理工作
  });

  it('应该执行某个功能', () => {
    // Arrange: 准备测试数据
    // Act: 执行被测试的功能
    // Assert: 验证结果
  });
});
```

### 5.3 Mock 使用

```typescript
// Mock 外部依赖
jest.mock('@/lib/api/reddit');

// Mock 实现
(redditApi.searchSubreddits as jest.Mock).mockResolvedValue([mockData]);

// 验证 Mock 调用
expect(redditApi.searchSubreddits).toHaveBeenCalledWith('test');
```

### 5.4 异步测试

```typescript
// 使用 async/await
it('应该异步获取数据', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// 使用 waitFor
await waitFor(() => {
  expect(screen.getByText('加载完成')).toBeInTheDocument();
});
```

## 六、已知问题和改进建议

### 6.1 已知问题

1. **超时测试失败**: fetch-helper 和 reddit API 的超时测试超过 5 秒限制
2. **URL 编码问题**: reddit API 测试中 URL 参数被编码，导致断言失败
3. **数据结构不匹配**: 部分测试的 mock 数据结构与实际 API 返回不一致
4. **Worker 测试缺失**: Web Worker 相关功能未覆盖测试

### 6.2 改进建议

#### 短期改进（优先级：高）

1. **修复失败的测试用例**
   - 增加超时测试的时间限制
   - 修正 URL 断言逻辑
   - 统一 mock 数据结构

2. **提升核心模块覆盖率**
   - 补充 API Routes 集成测试
   - 增加 UI 组件测试
   - 完善错误处理测试

3. **优化测试性能**
   - 减少不必要的 waitFor 调用
   - 使用更精确的选择器
   - 优化 mock 数据大小

#### 中期改进（优先级：中）

1. **添加集成测试**
   - 测试完整的用户流程
   - 测试模块间交互
   - 测试状态管理

2. **添加 E2E 测试**
   - 使用 Playwright 或 Cypress
   - 测试关键用户路径
   - 测试跨浏览器兼容性

3. **性能测试**
   - NLP 处理性能基准
   - API 响应时间测试
   - 大数据量处理测试

#### 长期改进（优先级：低）

1. **视觉回归测试**
   - 使用 Percy 或 Chromatic
   - 自动化 UI 变更检测

2. **可访问性测试**
   - 使用 jest-axe
   - 键盘导航测试
   - 屏幕阅读器兼容性

3. **安全测试**
   - XSS 防护测试
   - SQL 注入测试
   - API 限流测试

## 七、测试覆盖率目标

### 7.1 当前覆盖率

| 模块 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| lib/api/fetch-helper.ts | 100% | 85.71% | 100% | 100% |
| lib/api/reddit.ts | 51.06% | 38.15% | 56.25% | 51.14% |
| lib/nlp.ts | 48.35% | 50% | 47.05% | 49.22% |
| lib/utils.ts | 64.47% | 31.25% | 68.75% | 68.57% |
| features/analysis/hooks/useAnalysis.ts | 54.61% | 24% | 61.76% | 55.55% |
| features/analysis/components/AnalysisProgress.tsx | 92.06% | 92.85% | 100% | 94.73% |
| features/topic-selection/hooks/useTopicSearch.ts | 55.75% | 45.83% | 43.47% | 57.4% |
| features/topic-selection/hooks/useSearchHistory.ts | 81.08% | 66.66% | 100% | 80% |
| features/topic-selection/components/TopicCard.tsx | 97.95% | 83.33% | 100% | 97.87% |
| features/topic-selection/components/TopicSearchInput.tsx | 67.07% | 48.71% | 78.94% | 67.9% |

### 7.2 目标覆盖率

| 模块类型 | 目标覆盖率 | 当前覆盖率 | 差距 |
|----------|-----------|-----------|------|
| 核心业务逻辑 | 80% | 55% | -25% |
| API 工具 | 80% | 60% | -20% |
| UI 组件 | 70% | 40% | -30% |
| 工具函数 | 70% | 65% | -5% |

## 八、持续集成

### 8.1 CI/CD 配置建议

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

### 8.2 测试门禁

- 所有测试必须通过才能合并 PR
- 新增代码必须包含测试
- 覆盖率不能低于当前水平

## 九、参考资源

- [Jest 官方文档](https://jestjs.io/)
- [React Testing Library 文档](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing 指南](https://nextjs.org/docs/testing)

## 十、更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0.0 | 2026-01-18 | 初始版本，建立测试框架和基础测试用例 |
