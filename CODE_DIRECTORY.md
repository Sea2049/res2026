# Reddit Insight Tool 代码目录

本文档记录项目的完整文件结构，按目录层级组织，便于开发者快速定位和理解代码分布。所有文件按类型和功能分类，标注其作用说明。

## 一、根目录文件

根目录包含项目的配置文件、依赖定义和部署相关文件，是项目运行的必要基础。

| 文件名 | 类型 | 说明 |
|--------|------|------|
| package.json | JSON | 项目依赖定义，包含所有 npm 脚本和依赖包版本 |
| next.config.mjs | MJS | Next.js 构建配置，启用 standalone 输出模式 |
| tsconfig.json | JSON | TypeScript 编译配置，定义类型检查规则和编译选项 |
| tailwind.config.ts | TS | Tailwind CSS 配置，定义主题色和自定义样式变体 |
| jest.config.js | JS | Jest 测试框架配置，设置测试环境和覆盖率阈值 |
| jest.setup.js | JS | Jest 测试设置文件，配置测试环境和全局 mock |
| .eslintrc.json | JSON | ESLint 代码规范配置，定义代码检查规则 |
| .prettierrc | JSON | Prettier 格式化配置，统一代码风格 |
| .gitignore | GIT | Git 忽略规则，指定不纳入版本控制的文件 |
| Dockerfile | DOCKER | Docker 多阶段构建配置，优化镜像大小 |
| docker-compose.yml | YAML | Docker Compose 编排配置，定义容器运行参数 |
| .dockerignore | DOCKER | Docker 构建上下文忽略规则 |
| .env.production | ENV | 生产环境变量模板，包含必需的配置项 |
| FRAMEWORK.md | MD | 框架文档，详细说明项目架构和技术选型 |
| CODE_DIRECTORY.md | MD | 代码目录，记录所有源文件的位置和作用 |
| README.md | MD | 项目说明文档，包含功能介绍和使用指南 |
| DEPLOYMENT.md | MD | 部署文档，阿里云 ECS 环境部署指南 |
| TESTING.md | MD | 测试文档，包含测试策略、覆盖率和最佳实践 |

## 二、源代码目录结构

src 目录是项目的主要源代码入口，包含应用逻辑、组件定义和工具函数。目录下设四个核心子目录，分别承担不同的职责。

```
src/
├── app/                    # Next.js App Router 页面和 API Routes
├── components/             # 通用 UI 组件库
├── features/               # 功能模块，按业务划分
└── lib/                    # 工具函数和基础支撑代码
```

## 三、页面目录（app）

app 目录遵循 Next.js 14+ App Router 规范，包含页面的路由定义、布局组件、API Routes 和全局样式。页面组件直接对应 URL 路由，是用户访问应用的入口。API Routes 位于 app/api 目录下，按功能模块组织服务端接口。

### 3.1 页面组件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/app/page.tsx | TSX | 应用首页组件，整合话题选择和分析功能的主页面 |
| src/app/layout.tsx | TSX | 根布局组件，定义全局结构、字体和样式提供者 |

### 3.2 API Routes

API Routes 实现服务端代理，统一处理与 Reddit API 的通信，保护 API 密钥安全。

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/app/api/reddit/subreddit/route.ts | TS | Subreddit 端点，处理社区搜索和信息查询 |
| src/app/api/reddit/search/route.ts | TS | Search 端点，处理帖子搜索和结果筛选 |
| src/app/api/reddit/comments/route.ts | TS | Comments 端点，处理评论获取和分页 |

## 四、组件库目录（components）

components 目录存放通用的 UI 组件，这些组件不依赖特定业务逻辑，可在项目各处复用。组件库基于 Shadcn/UI 构建，经过样式定制以保持视觉一致性。

### 4.1 UI 基础组件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/components/ui/button.tsx | TSX | 按钮组件，支持多种变体（默认、主要、危险、文字）和尺寸 |
| src/components/ui/input.tsx | TSX | 输入框组件，支持前后图标、禁用状态和表单验证集成 |
| src/components/ui/card.tsx | TSX | 卡片组件，用于内容分组展示，包含头部、主体和底部区域 |
| src/components/ui/badge.tsx | TSX | 标签组件，用于状态和分类标识，支持多种颜色变体 |
| src/components/ui/spinner.tsx | TSX | 加载动画组件，用于异步操作时的加载状态反馈 |
| src/components/ui/alert.tsx | TSX | 警告组件，用于展示提示信息和错误消息，支持多种严重级别 |
| src/components/ui/tabs.tsx | TSX | 标签页组件，用于内容的分组切换展示 |
| src/components/ui/separator.tsx | TSX | 分隔线组件，用于视觉上的内容分割 |
| src/components/ui/select.tsx | TSX | 下拉选择组件，用于从预定义选项中选择单个值 |
| src/components/ui/dialog.tsx | TSX | 对话框组件，用于模态交互，如确认操作和详情展示 |
| src/components/ui/dropdown-menu.tsx | TSX | 下拉菜单组件，用于右键菜单和下拉操作列表 |
| src/components/ui/tooltip.tsx | TSX | 提示组件，用于鼠标悬停时显示补充信息 |
| src/components/ui/progress.tsx | TSX | 进度条组件，用于展示任务完成进度和百分比 |

### 4.2 组件索引

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/components/index.ts | TS | 组件库统一导出入口，集中导出所有 UI 组件便于引用 |

## 五、功能模块目录（features）

features 目录按业务功能组织代码，每个子目录代表一个独立的功能域。功能模块内包含组件、钩子和类型定义，形成完整的业务闭环。

### 5.1 话题选择模块（topic-selection）

话题选择模块负责 Reddit 数据的搜索和筛选，是用户与系统交互的入口。模块包含搜索输入、结果展示、搜索建议和高级筛选等功能。

#### 5.1.1 模块入口

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/topic-selection/index.tsx | TSX | 话题选择模块入口组件，整合搜索、列表和历史功能 |

#### 5.1.2 功能组件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/topic-selection/components/TopicSearchInput.tsx | TSX | 搜索输入组件，处理用户查询输入和搜索触发 |
| src/features/topic-selection/components/TopicList.tsx | TSX | 话题列表组件，展示搜索结果并进行话题选择 |
| src/features/topic-selection/components/SearchSuggestions.tsx | TSX | 搜索建议组件，提供搜索建议和自动补全功能 |
| src/features/topic-selection/components/AdvancedSearchOptions.tsx | TSX | 高级搜索选项组件，提供时间范围、排序方式等筛选条件 |
| src/features/topic-selection/components/TopicCard.tsx | TSX | 话题卡片组件，展示单个话题的摘要信息 |

#### 5.1.3 自定义钩子

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/topic-selection/hooks/useTopicSearch.ts | TS | 搜索逻辑钩子，处理搜索请求、状态管理、防抖搜索、批量选择和全选功能 |
| src/features/topic-selection/hooks/useSearchHistory.ts | TS | 搜索历史钩子，管理用户搜索历史的存储和读取 |

#### 5.1.4 单元测试

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/topic-selection/hooks/__tests__/useTopicSearch.test.ts | TS | useTopicSearch 钩子的单元测试，覆盖搜索场景（8个测试用例） |
| src/features/topic-selection/hooks/__tests__/useSearchHistory.test.ts | TS | useSearchHistory 钩子的单元测试，覆盖历史管理场景（4个测试用例） |
| src/features/topic-selection/components/__tests__/TopicSearchInput.test.tsx | TSX | TopicSearchInput 组件的单元测试（4个测试用例） |
| src/features/topic-selection/components/__tests__/TopicCard.test.tsx | TSX | TopicCard 组件的单元测试（4个测试用例） |

### 5.2 分析模块（analysis）

分析模块负责对选中话题进行深度分析，包括评论获取、情感分析、关键词提取和洞察检测。模块将原始数据转化为用户可理解的可视化报告。

#### 5.2.1 模块入口

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/analysis/index.tsx | TSX | 分析模块入口组件，协调各子组件的工作流程 |

#### 5.2.2 可视化组件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/analysis/components/CommentList.tsx | TSX | 评论列表组件，展示原始评论数据支持展开查看 |
| src/features/analysis/components/SentimentChart.tsx | TSX | 情感图表组件，可视化情感分析结果的分布情况 |
| src/features/analysis/components/KeywordCloud.tsx | TSX | 关键词云组件，以词云形式展示高频关键词 |
| src/features/analysis/components/AnalysisProgress.tsx | TSX | 分析进度组件，展示当前分析阶段和整体进度 |
| src/features/analysis/components/InsightCard.tsx | TSX | 洞察卡片组件，呈现检测到的用户痛点和建议，**默认展示前 2 条相关评论预览，支持展开查看全部评论** |
| src/features/analysis/components/InsightFilters.tsx | TSX | 洞察筛选组件，提供按类型、情感和关键词过滤洞察的功能 |
| src/features/analysis/components/InsightGraph.tsx | TSX | 洞察图谱组件，以图谱形式展示洞察之间的关系和关联性 |
| src/features/analysis/components/InsightTrendChart.tsx | TSX | 洞察趋势图表组件，支持按时间维度分析洞察变化 |
| src/features/analysis/components/DeepInsights.tsx | TSX | AI深度洞见组件，展示GLM-4模型生成的深度分析报告，支持Markdown渲染和导出 |
| src/features/analysis/components/EmptyState.tsx | TSX | 空状态组件，在无数据时显示友好的空状态提示 |

#### 5.2.3 业务逻辑

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/analysis/hooks/useAnalysis.ts | TS | 分析流程钩子，管理分析状态机和流水线处理 |
| src/features/analysis/hooks/useDeepInsights.ts | TS | 深度洞见生成钩子，管理AI洞见生成状态和错误处理 |
| src/features/analysis/hooks/useInsightTrend.ts | TS | 洞察趋势钩子，负责洞察趋势数据的计算和聚合，支持按时间维度分析洞察变化 |

#### 5.2.4 单元测试

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/features/analysis/hooks/__tests__/useAnalysis.test.ts | TS | useAnalysis 钩子的单元测试，覆盖分析流程（9个测试用例） |
| src/features/analysis/components/__tests__/AnalysisProgress.test.tsx | TSX | AnalysisProgress 组件的单元测试（8个测试用例） |

## 六、基础支撑目录（lib）

lib 目录包含项目的工具函数、类型定义、外部服务封装、API 辅助函数、错误处理和 Worker 线程等基础支撑代码。

### 6.1 API 辅助工具

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/api/fetch-helper.ts | TS | Fetch 工具模块，提供统一的请求封装和错误处理逻辑 |
| src/lib/api/reddit.ts | TS | Reddit API 类型定义，包含请求和响应的 TypeScript 类型 |

### 6.2 工具模块

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/utils.ts | TS | 通用工具函数集合，包括日期格式化、字符串处理等 |
| src/lib/nlp.ts | TS | 自然语言处理模块(v2.3.0优化版)，包含分词、情感分析和关键词提取，新增LRU缓存、MinHeap堆算法、批量TF-IDF计算等性能优化 |
| src/lib/errors.ts | TS | 错误处理模块，定义统一的错误类型和处理机制 |

### 6.2.1 AI集成模块

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/ai/zhipu-ai.ts | TS | 智谱AI客户端，封装GLM-4 API调用逻辑，实现JWT token生成和请求签名 |
| src/lib/ai/prompts.ts | TS | Prompt模板系统，将分析结果转换为AI友好的格式，包含结构化的分析维度 |

### 6.3 Worker 线程

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/workers/worker-manager.ts | TS | Worker 管理器，负责 Worker 线程的创建、任务分发和结果回收 |
| src/lib/workers/nlp.worker.ts | TS | NLP Worker，执行自然语言处理计算任务，避免阻塞主线程 |

### 6.4 测试文件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/__tests__/nlp.test.ts | TS | NLP 模块的单元测试，覆盖核心处理函数（7个测试用例） |
| src/lib/api/__tests__/fetch-helper.test.ts | TS | Fetch 辅助工具的单元测试，覆盖多策略回退机制（8个测试用例） |
| src/lib/api/__tests__/reddit.test.ts | TS | Reddit API 客户端的单元测试，覆盖所有 API 方法（9个测试用例） |

### 6.5 类型定义

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| src/lib/types.ts | TS | 全局类型定义，包含 API 响应、业务实体和组件 Props 类型 |

## 七、文件统计汇总

### 7.1 按类型统计

| 文件类型 | 数量 | 占比 |
|----------|------|------|
| TypeScript 组件（.tsx） | 35 | 61.4% |
| TypeScript 工具（.ts） | 22 | 38.6% |
| 测试文件（.test.ts/.test.tsx） | 12 | - |
| 配置文件 | 18 | - |
| 文档文件 | 5 | - |

### 7.2 按目录统计

| 目录 | 组件 | 工具 | 测试 | API | Worker | 小计 |
|------|------|------|------|-----|------|------|
| src/app | 2 | 0 | 0 | 4 | 0 | 6 |
| src/components/ui | 13 | 0 | 3 | 0 | 0 | 16 |
| src/components | 0 | 1 | 0 | 0 | 0 | 1 |
| src/features/topic-selection | 5 | 2 | 4 | 0 | 0 | 11 |
| src/features/analysis | 9 | 2 | 1 | 0 | 0 | 12 |
| src/lib/api | 0 | 2 | 2 | 0 | 0 | 4 |
| src/lib | 0 | 4 | 1 | 0 | 2 | 7 |
| src/integration | 0 | 0 | 1 | 0 | 0 | 1 |
| **总计** | **35** | **12** | **12** | **4** | **2** | **65** |

### 7.3 文件清单

全部源文件清单如下，按字母顺序排列：

| 序号 | 文件路径 |
|------|----------|
| 1 | src/app/api/ai/insights/route.ts |
| 2 | src/app/api/reddit/comments/route.ts |
| 3 | src/app/api/reddit/search/route.ts |
| 4 | src/app/api/reddit/subreddit/route.ts |
| 5 | src/app/layout.tsx |
| 6 | src/app/page.tsx |
| 7 | src/components/index.ts |
| 8 | src/components/ui/__tests__/Button.test.tsx |
| 9 | src/components/ui/__tests__/Card.test.tsx |
| 10 | src/components/ui/__tests__/Input.test.tsx |
| 11 | src/components/ui/alert.tsx |
| 12 | src/components/ui/badge.tsx |
| 13 | src/components/ui/button.tsx |
| 14 | src/components/ui/card.tsx |
| 15 | src/components/ui/dialog.tsx |
| 16 | src/components/ui/dropdown-menu.tsx |
| 17 | src/components/ui/input.tsx |
| 18 | src/components/ui/progress.tsx |
| 19 | src/components/ui/select.tsx |
| 20 | src/components/ui/separator.tsx |
| 21 | src/components/ui/spinner.tsx |
| 22 | src/components/ui/tabs.tsx |
| 23 | src/components/ui/tooltip.tsx |
| 24 | src/features/analysis/components/AnalysisProgress.tsx |
| 25 | src/features/analysis/components/CommentList.tsx |
| 26 | src/features/analysis/components/DeepInsights.tsx |
| 27 | src/features/analysis/components/EmptyState.tsx |
| 28 | src/features/analysis/components/InsightCard.tsx |
| 29 | src/features/analysis/components/InsightFilters.tsx |
| 30 | src/features/analysis/components/InsightGraph.tsx |
| 31 | src/features/analysis/components/InsightTrendChart.tsx |
| 32 | src/features/analysis/components/KeywordCloud.tsx |
| 33 | src/features/analysis/components/SentimentChart.tsx |
| 34 | src/features/analysis/hooks/useAnalysis.ts |
| 35 | src/features/analysis/hooks/useDeepInsights.ts |
| 36 | src/features/analysis/hooks/useInsightTrend.ts |
| 37 | src/features/analysis/index.tsx |
| 38 | src/features/topic-selection/components/AdvancedSearchOptions.tsx |
| 39 | src/features/topic-selection/components/SearchSuggestions.tsx |
| 40 | src/features/topic-selection/components/TopicCard.tsx |
| 41 | src/features/topic-selection/components/TopicList.tsx |
| 42 | src/features/topic-selection/components/TopicSearchInput.tsx |
| 43 | src/features/topic-selection/components/__tests__/TopicCard.test.tsx |
| 44 | src/features/topic-selection/components/__tests__/TopicSearchInput.test.tsx |
| 45 | src/features/topic-selection/hooks/__tests__/useSearchHistory.test.ts |
| 46 | src/features/topic-selection/hooks/__tests__/useTopicSearch.test.ts |
| 47 | src/features/topic-selection/hooks/useSearchHistory.ts |
| 48 | src/features/topic-selection/hooks/useTopicSearch.ts |
| 49 | src/features/topic-selection/index.tsx |
| 50 | src/integration/__tests__/user-flow.test.ts |
| 51 | src/lib/__tests__/nlp.test.ts |
| 52 | src/lib/ai/prompts.ts |
| 53 | src/lib/ai/zhipu-ai.ts |
| 54 | src/lib/api/fetch-helper.ts |
| 55 | src/lib/api/reddit.ts |
| 56 | src/lib/errors.ts |
| 57 | src/lib/nlp.ts |
| 58 | src/lib/types.ts |
| 59 | src/lib/utils.ts |
| 60 | src/lib/workers/nlp.worker.ts |
| 61 | src/lib/workers/worker-manager.ts |

## 八、测试覆盖情况

### 8.1 测试统计

- **测试套件总数**: 12 个
- **测试用例总数**: 约 85+ 个
- **整体覆盖率**: 约 30%

### 8.2 模块覆盖率

| 模块 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 | 行覆盖率 |
|------|-----------|-----------|-----------|---------|
| lib/api/fetch-helper.ts | 100% | 85.71% | 100% | 100% |
| lib/api/reddit.ts | 51.06% | 38.15% | 56.25% | 51.14% |
| lib/nlp.ts | 48.35% | 50% | 47.05% | 49.22% |
| features/analysis/hooks/useAnalysis.ts | 54.61% | 24% | 61.76% | 55.55% |
| features/analysis/components/AnalysisProgress.tsx | 92.06% | 92.85% | 100% | 94.73% |
| features/topic-selection/hooks/useTopicSearch.ts | 55.75% | 45.83% | 43.47% | 57.4% |
| features/topic-selection/components/TopicCard.tsx | 97.95% | 83.33% | 100% | 97.87% |
| components/ui/Button.tsx | ~95% | ~85% | 100% | ~95% |
| components/ui/Card.tsx | ~95% | ~85% | 100% | ~95% |
| components/ui/Input.tsx | ~90% | ~80% | 100% | ~90% |

### 8.3 测试类型分布

| 测试类型 | 文件数量 | 说明 |
|----------|----------|------|
| 单元测试（组件） | 5 | Button、Card、Input、TopicCard、TopicSearchInput |
| 单元测试（钩子） | 5 | useAnalysis、useTopicSearch、useSearchHistory |
| 单元测试（工具） | 3 | nlp、fetch-helper、reddit |
| 集成测试 | 1 | user-flow 端到端测试 |

详细测试文档请参考 [TESTING.md](./TESTING.md)

## 九、更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v2.5.0 | 2026-01-18 | 可视化增强：新增 InsightFilters、InsightGraph、InsightTrendChart 三个可视化组件；趋势分析：新增 useInsightTrend 钩子，支持按时间维度分析洞察变化；测试完善：新增集成测试模块（user-flow.test.ts）和 UI 组件测试（Button、Card、Input）；文件总数从 48 个增加到 61 个 |
| v2.4.0 | 2026-01-17 | AI深度洞见：集成智谱AI GLM-4模型，新增 zhipu-ai.ts 和 prompts.ts；新增 useDeepInsights 钩子和 DeepInsights 组件；新增 /api/ai/insights API端点 |
| v2.3.0 | 2026-01-18 | 测试体系建立：新增 9 个测试文件，81 个测试用例，整体覆盖率 28.71%；新增 jest.setup.js 和 TESTING.md 文档；文件总数从 53 个增加到 55 个 |
| v2.2.0 | 2026-01-18 | 话题选择模块优化：新增防抖搜索、智能建议、分类显示、批量选择和全选功能；使用 React.memo 和 useMemo 优化组件渲染性能；增强键盘导航支持 |
| v2.1.0 | 2026-01-16 | 文档全面更新：更新文件统计（29 组件、17 工具）、修正不一致的文件路径和描述、更新 API Routes 和 Worker 架构说明 |
| v2.0.0 | 2026-01-15 | 新增 Web Worker 架构、错误处理模块、EmptyState 组件，TypeScript 工具文件从 14 个增加到 17 个，组件文件从 28 个增加到 29 个 |
| v1.2.0 | 2026-01-12 | 新增 3 个 API Routes 端点（subreddit、search、comments），新增 fetch-helper 工具模块，TypeScript 工具文件从 10 个增加到 14 个 |
| v1.1.0 | 2026-01-10 | 新增 6 个组件文件（tooltip、tabs、separator、select、progress、dialog），文件总数达到 28 个组件 |
| v1.0.0 | 2026-01-05 | 初始版本，22 个组件文件，8 个工具文件 |
