# Reddit Insight Tool 框架文档

## 1. 项目概述
本项目是一个基于 Reddit 的社区主题筛选与分析工具，旨在帮助用户发现热门主题并洞察用户痛点。

## 2. 技术栈
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件库**: Shadcn/UI
- **状态管理**: React Hooks
- **API 集成**: Reddit API
- **测试框架**: Jest + React Testing Library
- **容器化**: Docker + Docker Compose
- **部署**: 阿里云 ECS / 任意 Linux 服务器

## 3. 架构设计
本项目采用 **Feature-based (基于功能)** 的模块化架构。

### 3.1 目录结构
```
src/
├── app/                    # 页面路由和布局
├── components/             # 通用 UI 组件 (Shadcn/UI)
│   └── ui/                 # 基础 UI 组件库
├── features/               # 业务功能模块
│   ├── topic-selection/    # 主题搜索、筛选和选择功能
│   └── analysis/           # 评论分析、关键词提取、痛点洞察功能
└── lib/                    # 工具函数、API 客户端、类型定义
    ├── api/                # Reddit API 客户端
    ├── nlp.ts              # NLP 自然语言处理模块
    ├── types.ts            # 类型定义
    └── utils.ts            # 工具函数
```

### 3.2 核心模块说明

#### A. Topic Selection (主题筛选)
- **功能**: 用户输入关键词，系统调用 Reddit API 搜索 Subreddits 或 Posts，用户手动选择感兴趣的主题。
- **组件**:
  - `TopicSearchInput`: 搜索输入框，支持输入验证和回车键搜索
  - `TopicList`: 搜索结果列表组件，支持空状态和加载状态
  - `TopicCard`: 单个主题卡片组件，显示 Subreddit 或 Post 信息
  - `SearchSuggestions`: 搜索建议组件，展示搜索历史记录
  - `AdvancedSearchOptions`: 高级搜索选项组件，提供类型筛选和排序选项
- **Hooks**:
  - `useTopicSearch`: 搜索状态管理
  - `useSearchHistory`: 搜索历史管理
- **测试**:
  - `TopicCard.test.tsx`: 组件单元测试
  - `TopicSearchInput.test.tsx`: 组件单元测试
  - `useTopicSearch.test.ts`: Hook 单元测试
  - `useSearchHistory.test.ts`: Hook 单元测试

#### B. Analysis (分析追踪)
- **功能**: 对选中主题下的评论进行抓取，分析高频关键词，识别负面情绪或需求表达（痛点）。
- **组件**:
  - `AnalysisDashboard`: 分析仪表板主组件
  - `KeywordCloud`: 关键词云组件
  - `SentimentChart`: 情感分布图表组件
  - `InsightCard`: 洞察卡片组件
  - `CommentList`: 评论列表组件
  - `AnalysisProgress`: 分析进度组件
- **Hooks**:
  - `useAnalysis`: 分析状态管理
- **逻辑**: NLP 处理（停用词过滤、频率统计、情感分析、洞察检测）

### 3.3 技术实现细节

#### UI 组件库 (`src/components/ui/`)
- **基础组件**: Button, Card, Input, Badge, Spinner, Alert
- **导航组件**: Tabs, DropdownMenu
- **交互组件**: Dialog, Select, Tooltip, Progress
- **布局组件**: Separator

#### NLP 自然语言处理模块 (`src/lib/nlp.ts`)
- **英文停用词列表**: 过滤常见无意义词汇
- **文本清洗**: HTML 转义、XSS 防护
- **分词处理**: 英文分词、停用词过滤
- **关键词提取**: 词频统计、排序
- **情感分析**: 基于关键词的情感分类（正面/中性/负面）
- **洞察检测**: 识别痛点、功能需求、问题、赞美

#### Reddit API 客户端 (`src/lib/api/reddit.ts`)
- `searchSubreddits()`: 搜索 Subreddits
- `searchPosts()`: 搜索 Posts
- `getComments()`: 获取帖子评论
- `getSubredditPosts()`: 获取 Subreddit 热门帖子
- `getMultiplePostComments()`: 批量获取多个帖子的评论
- `getSubredditComments()`: 获取 Subreddit 热门帖子评论

### 3.4 生产环境部署

#### Docker 部署架构
```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Container                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Reddit Insight Tool (Port 3000)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 部署文件说明

| 文件 | 作用 |
|------|------|
| `Dockerfile` | 多阶段构建，优化镜像体积，支持 standalone 模式 |
| `docker-compose.yml` | 容器编排配置，包含健康检查和日志管理 |
| `.env.production` | 生产环境变量模板 |
| `.dockerignore` | Docker 构建忽略文件，优化构建上下文 |
| `DEPLOYMENT.md` | 详细的阿里云部署指南 |
| `next.config.mjs` | 生产环境优化配置（standalone 输出、缓存策略） |

## 4. 开发规范
- **注释**: 所有关键代码（接口、复杂逻辑、组件 Props）必须包含中文注释。
- **类型安全**: 严格使用 TypeScript 类型。
- **文档**: 每次修改代码结构需同步更新 `CODE_DIRECTORY.md`。
- **测试**: 核心组件和 Hooks 需要编写单元测试。
- **命名规范**: 
  - 变量和函数: 驼峰命名法 (camelCase)
  - 组件: 帕斯卡命名法 (PascalCase)
  - 测试文件: `*.test.ts` 或 `*.test.tsx`

## 5. 安全与边界检查 (自问清单)
- **SQL 注入 / XSS**: 对所有用户输入和 API 返回内容进行转义或清洗。
- **边界情况**: 处理 API 请求失败、空数据、网络超时等情况。
- **API 限流**: 实现请求取消机制，防止重复请求。
- **本地存储**: 搜索历史使用 localStorage，注意存储大小限制。
- **容器安全**: 使用非 root 用户运行，限制容器权限。

## 6. 文件统计

| 类型 | 数量 |
|------|------|
| TypeScript 组件 (.tsx) | 28 |
| TypeScript 文件 (.ts) | 10 |
| 测试文件 (.test.ts/.test.tsx) | 4 |
| Docker/部署文件 | 5 |
| CSS 文件 (.css) | 1 |
| **总计** | **48** |

## 7. 更新日志

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
新增自然语言处理模块，实现评论分析核心功能。

### 2026-01-14 - Topic Selection 功能增强
新增搜索建议和高级搜索选项功能。

### 2026-01-14 - 项目初始化完成
完成基础项目结构和核心功能模块。
