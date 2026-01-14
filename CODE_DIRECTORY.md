# 代码目录索引

本文件记录项目的文件结构及其作用，随项目更新而更新。

## 根目录

| 目录/文件 | 作用 |
|-----------|------|
| `FRAMEWORK.md` | 项目框架设计文档。 |
| `CODE_DIRECTORY.md` | 代码目录索引（本文档）。 |
| `README.md` | 项目说明文档，包含功能特性、快速开始和部署指南。 |
| `DEPLOYMENT.md` | 阿里云部署详细指南，包含 ECS 配置、Docker 部署、Nginx 反向代理、SSL 证书配置。 |
| `package.json` | 项目依赖配置。 |
| `next.config.mjs` | Next.js 配置文件，包含生产环境优化（standalone 输出、缓存策略）。 |
| `tsconfig.json` | TypeScript 配置文件。 |
| `tailwind.config.ts` | Tailwind CSS 配置文件。 |
| `Dockerfile` | 多阶段 Docker 构建配置，优化镜像体积，支持 standalone 模式。 |
| `docker-compose.yml` | Docker Compose 编排配置，包含健康检查和日志管理。 |
| `.env.production` | 生产环境变量模板。 |
| `.dockerignore` | Docker 构建忽略文件，优化构建上下文。 |

## src 目录

| 目录/文件 | 作用 |
|-----------|------|
| `src/app/` | 应用页面路由和布局目录 |
| `src/app/layout.tsx` | 根布局文件，定义全局 HTML 结构和元数据 |
| `src/app/page.tsx` | 首页，整合 TopicSelection 和 AnalysisDashboard 组件 |
| `src/app/globals.css` | 全局样式，配置 Tailwind CSS 变量 |
| `src/components/` | 通用 UI 组件目录 |
| `src/components/index.ts` | 组件统一导出文件 |
| `src/components/ui/` | Shadcn/UI 风格的基础组件库 |
| `src/components/ui/button.tsx` | 按钮组件，支持多种变体（primary/secondary/ghost/outline/destructive）和尺寸（sm/md/lg） |
| `src/components/ui/card.tsx` | 卡片容器组件，包含 Card、CardHeader、CardTitle、CardDescription、CardContent、CardFooter |
| `src/components/ui/input.tsx` | 输入框组件，支持错误状态 |
| `src/components/ui/badge.tsx` | 标签/徽章组件，支持多种变体（default/primary/secondary/success/warning/danger/outline） |
| `src/components/ui/spinner.tsx` | 加载动画组件，支持多种尺寸（sm/md/lg/xl）和颜色（default/primary/white/gray） |
| `src/components/ui/alert.tsx` | 警告/提示信息组件，支持多种变体（default/info/success/warning/error）和关闭功能 |
| `src/components/ui/tabs.tsx` | 标签页组件，包含 Tabs、TabsList、TabsTrigger、TabsContent |
| `src/components/ui/separator.tsx` | 分隔线组件，支持水平和垂直方向 |
| `src/components/ui/select.tsx` | 下拉选择器组件，包含 Select、SelectTrigger、SelectContent、SelectItem |
| `src/components/ui/dialog.tsx` | 对话框/模态框组件，包含 Dialog、DialogHeader、DialogTitle、DialogDescription、DialogContent、DialogFooter、DialogClose |
| `src/components/ui/dropdown-menu.tsx` | 下拉菜单组件，包含 DropdownMenu、DropdownMenuTrigger、DropdownMenuContent、DropdownMenuItem、DropdownMenuSeparator |
| `src/components/ui/tooltip.tsx` | 工具提示组件，支持多种位置（top/bottom/left/right）和延迟显示 |
| `src/components/ui/progress.tsx` | 进度条组件，支持多种变体（default/success/warning/danger）和百分比显示 |
| `src/features/` | 业务功能模块目录 |
| `src/features/topic-selection/` | 主题搜索、筛选和选择功能模块 |
| `src/features/topic-selection/index.tsx` | 主题筛选主组件，整合搜索输入框、搜索结果列表和主题选择功能 |
| `src/features/topic-selection/components/` | 主题筛选相关组件目录 |
| `src/features/topic-selection/components/TopicSearchInput.tsx` | 搜索输入框组件，支持输入验证和回车键搜索 |
| `src/features/topic-selection/components/TopicCard.tsx` | 单个主题卡片组件，显示 Subreddit 或 Post 信息，支持选择/取消选择 |
| `src/features/topic-selection/components/TopicList.tsx` | 搜索结果列表组件，渲染 TopicCard 列表，支持空状态和加载状态 |
| `src/features/topic-selection/components/SearchSuggestions.tsx` | 搜索建议组件，展示搜索历史记录，提供快捷搜索建议 |
| `src/features/topic-selection/components/AdvancedSearchOptions.tsx` | 高级搜索选项组件，提供 Subreddit/Post 类型筛选和排序选项 |
| `src/features/topic-selection/components/__tests__/` | 组件测试文件目录 |
| `src/features/topic-selection/components/__tests__/TopicCard.test.tsx` | TopicCard 组件单元测试 |
| `src/features/topic-selection/components/__tests__/TopicSearchInput.test.tsx` | TopicSearchInput 组件单元测试 |
| `src/features/topic-selection/hooks/` | 主题筛选相关 Hooks 目录 |
| `src/features/topic-selection/hooks/useTopicSearch.ts` | 搜索状态管理 Hook，管理搜索关键词、搜索结果、加载状态、错误信息和已选主题 |
| `src/features/topic-selection/hooks/useSearchHistory.ts` | 搜索历史管理 Hook，管理本地存储的搜索历史记录 |
| `src/features/topic-selection/hooks/__tests__/` | Hook 测试文件目录 |
| `src/features/topic-selection/hooks/__tests__/useTopicSearch.test.ts` | useTopicSearch Hook 单元测试 |
| `src/features/topic-selection/hooks/__tests__/useSearchHistory.test.ts` | useSearchHistory Hook 单元测试 |
| `src/features/analysis/` | 评论分析、关键词提取、痛点洞察功能模块 |
| `src/features/analysis/index.tsx` | 分析仪表板主组件，整合所有分析功能，提供完整的分析和可视化界面 |
| `src/features/analysis/components/` | 分析相关组件目录 |
| `src/features/analysis/components/KeywordCloud.tsx` | 关键词云组件，以标签云形式展示高频关键词，大小和颜色反映词频和情感 |
| `src/features/analysis/components/SentimentChart.tsx` | 情感分布图表组件，以柱状图形式展示正面、中性、负面评论的比例分布 |
| `src/features/analysis/components/InsightCard.tsx` | 洞察卡片组件，展示分析发现的用户痛点、功能需求、问题或赞美信息 |
| `src/features/analysis/components/CommentList.tsx` | 评论列表组件，展示带情感标签的评论列表，支持筛选和高亮显示 |
| `src/features/analysis/components/AnalysisProgress.tsx` | 分析进度组件，展示当前分析阶段、进度百分比和状态信息 |
| `src/features/analysis/hooks/` | 分析相关 Hooks 目录 |
| `src/features/analysis/hooks/useAnalysis.ts` | 分析状态管理 Hook，管理评论分析状态、结果获取、取消、导出和错误处理 |
| `src/lib/` | 工具函数、API 客户端、类型定义目录 |
| `src/lib/utils.ts` | 工具函数集合（类名合并、延迟、文本截断、HTML 转义、格式化、情感颜色等） |
| `src/lib/types.ts` | TypeScript 类型定义（Subreddit、Post、Comment、AnalysisResult 等），包含分析相关扩展类型 |
| `src/lib/nlp.ts` | NLP 自然语言处理模块，实现评论分析核心功能（停用词过滤、关键词提取、情感分析、用户洞察检测） |
| `src/lib/api/` | API 客户端目录 |
| `src/lib/api/reddit.ts` | Reddit API 客户端，提供搜索 Subreddits、Posts、获取评论、以及新增的获取 Subreddit 热门帖子和批量评论方法 |

## 文件统计

| 类型 | 数量 |
|------|------|
| TypeScript 组件 (.tsx) | 28 |
| TypeScript 文件 (.ts) | 10 |
| 测试文件 (.test.ts/.test.tsx) | 4 |
| Docker/部署文件 | 5 |
| 配置文件 | 6 |
| **总计** | **53** |

## 部署相关文件

| 文件 | 作用 | 说明 |
|------|------|------|
| `Dockerfile` | Docker 构建配置 | 多阶段构建，优化镜像体积约 100MB |
| `docker-compose.yml` | 容器编排配置 | 包含健康检查、日志管理 |
| `.env.production` | 环境变量模板 | 生产环境配置 |
| `.dockerignore` | 构建忽略配置 | 减少构建上下文大小 |
| `DEPLOYMENT.md` | 部署指南 | 阿里云 ECS 详细部署步骤 |
| `next.config.mjs` | Next.js 配置 | standalone 输出、缓存策略 |

## 更新日志

### 2026-01-14 - Docker 生产环境部署
新增完整的 Docker 容器化部署方案：
- `Dockerfile`: 多阶段构建，优化镜像体积
- `docker-compose.yml`: 容器编排配置
- `.env.production`: 生产环境变量模板
- `.dockerignore`: 构建忽略配置
- `DEPLOYMENT.md`: 阿里云部署详细指南
- `next.config.mjs`: 生产环境优化配置

### 2026-01-14 - 通用 UI 组件扩展
新增 5 个常用 UI 组件：Select 下拉选择器、Dialog 对话框、DropdownMenu 下拉菜单、Tooltip 工具提示、Progress 进度条。

### 2026-01-14 - 单元测试覆盖
新增测试文件，确保核心功能的测试覆盖。

### 2026-01-14 - NLP 模块
新增 NLP 自然语言处理模块，实现评论分析核心功能。

### 2026-01-14 - Topic Selection 功能增强
新增搜索建议和高级搜索选项功能。

### 2026-01-14 - 项目初始化完成
完成基础项目结构和核心功能模块。
