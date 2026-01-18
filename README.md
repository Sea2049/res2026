# Reddit Insight Tool

Reddit Insight Tool 是一个功能强大的 Reddit 社区话题分析与洞察工具，旨在帮助用户快速发现热门话题、深入理解用户反馈并提取有价值的商业洞察。基于 Reddit API 构建，结合先进的自然语言处理技术，为用户提供直观易用的数据分析体验。

## 主要功能

本工具提供两大核心功能模块，分别对应用户旅程的不同阶段。第一模块是话题选择模块，负责 Reddit 数据的搜索与筛选。用户可以通过输入 Subreddit 名称或帖子关键词进行搜索，系统会实时返回相关的话题列表。每个话题以卡片形式展示，包含标题、摘要、评论数和发布时间等关键信息。用户可以选中感兴趣的话题进入分析流程，也可以将话题添加到收藏夹以便后续查看。

第二模块是分析模块，负责对选中话题进行深度分析。分析流程首先自动抓取话题下的热门评论，然后对每条评论进行情感分析和关键词提取。情感分析将评论分为积极、消极和中性三类，并以可视化图表形式展示分布情况。关键词提取识别评论中的高频主题词，帮助用户快速把握讨论焦点。洞察检测功能通过模式匹配算法识别用户反馈中的痛点描述、功能建议和需求表达，为产品改进和商业决策提供数据支撑。**分析模块还提供丰富的可视化功能**：InsightFilters 支持按类型、情感和关键词筛选洞察；InsightGraph 以图谱形式展示洞察之间的关系；InsightTrendChart 展示洞察随时间变化的趋势；DeepInsights 集成智谱AI GLM-4模型，生成深度分析报告。

## 技术栈

本项目采用现代化的技术栈构建，确保了开发效率和运行性能的最佳平衡。后端框架选用 Next.js 14+，利用其 App Router 架构实现服务端渲染、静态生成和 API Routes 能力，显著提升首屏加载速度、SEO 效果和后端 API 服务能力。开发语言为 TypeScript，通过静态类型检查在编译阶段发现潜在错误，大幅提高代码质量和可维护性。样式方案采用 Tailwind CSS，结合原子化设计理念实现快速样式开发，同时配合 Shadcn/UI 组件库提供一致的设计语言和丰富的交互组件。

数据处理方面，项目通过 Next.js API Routes 实现服务端代理，统一处理与 Reddit API 的通信，将 API 密钥和敏感配置存储在服务端环境变量中，避免在前端代码中暴露。fetch-helper 工具模块提供统一的请求封装、错误处理和重试机制，有效处理网络异常和 API 限流情况。自然语言处理模块集成了中文和英文的处理能力，支持文本清洗、分词、停用词过滤、情感分析和关键词提取等核心功能。为提升处理性能，NLP 计算通过 Web Worker 在独立线程中执行，避免阻塞 UI 渲染。错误处理模块提供统一的错误类型和处理机制，确保整个应用的错误处理一致性。测试方面使用 Jest 和 React Testing Library 构建完整的单元测试体系，确保核心业务逻辑的可靠性。容器化部署基于 Docker，采用多阶段构建策略优化镜像大小，最终产出约 100MB 的精简镜像。

## 快速开始

### 环境准备

在开始之前，请确保您的开发环境满足以下要求。操作系统支持 Windows、macOS 和 Linux。必须安装 Node.js 18.17 或更高版本，建议使用 LTS 版本以获得最佳稳定性。包管理器推荐使用 pnpm，也可以使用 npm 或 yarn。Docker 环境用于生产部署，需要安装 Docker Desktop（Windows/macOS）或 Docker Engine（Linux）。

### 本地开发

克隆项目仓库到本地目录，进入项目根目录后执行以下命令安装依赖。首次安装可能需要几分钟时间，取决于网络状况。安装完成后，执行启动命令启动开发服务器。开发服务器启动后，默认运行在 http://localhost:3000，您可以在浏览器中访问该地址查看应用。开发模式下支持热重载，修改代码后页面会自动刷新。

```bash
# 克隆项目
git clone https://github.com/Sea2049/res2026.git
cd res2026

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 环境变量配置

项目根目录提供了 .env.production 文件作为生产环境变量的模板。复制该文件为 .env.local 并填入您的配置值。主要配置项包括 Reddit API 的客户端 ID、客户端密钥、用户代理信息和应用名称。请访问 Reddit 官网的开发者门户申请 API 凭证，遵守 Reddit 的 API 使用条款和速率限制规定。API 密钥必须存储在环境变量中，切勿写入代码仓库或提交到版本控制系统。

## API 架构

项目采用 Next.js API Routes 作为服务端代理层，统一处理所有与 Reddit API 的通信。这种架构设计带来了多重优势：API 密钥存储在服务端环境变量中，避免在前端代码暴露；服务端可以实现请求预处理、后处理和错误转换；通过 CORS 配置和请求限制可以更好地控制 API 访问频率。

API Routes 位于 src/app/api 目录下，按功能模块划分为三个端点：subreddit 端点处理 Subreddit 社区的搜索和信息获取；search 端点处理帖子搜索和结果筛选；comments 端点处理评论数据的获取和分页。每个端点都实现了完善的错误处理和请求验证，确保 API 的稳定性和可靠性。fetch-helper 工具模块提供统一的请求封装，包含请求超时控制、错误响应解析和指数退避重试机制。

## Web Worker 架构

为提升自然语言处理性能，项目采用 Web Worker 实现并行计算。Worker 线程位于 src/lib/workers 目录下，包含 worker-manager.ts 和 nlp.worker.ts 两个文件。worker-manager 负责 Worker 线程的创建、任务分发和结果回收，nlp.worker 执行具体的 NLP 计算任务。这种架构将 CPU 密集型操作从主线程分离，避免阻塞 UI 渲染，提升用户体验。

## Docker 部署

### 构建生产镜像

项目提供了完整的 Docker 部署支持，采用多阶段构建策略优化镜像大小。执行以下命令构建生产镜像。构建过程会自动安装依赖、编译应用并打包运行时文件。构建完成后，镜像大小约为 100MB，相比直接使用 Node.js 基础镜像减少了约 70% 的体积。

```bash
# 构建 Docker 镜像
docker build -t reddit-insight-tool:latest .
```

### 使用 Docker Compose 运行

项目根目录提供了 docker-compose.yml 文件，定义了完整的容器运行环境。执行以下命令启动服务。Docker Compose 会自动创建网络、挂载数据卷并配置健康检查。服务启动后，可以通过 http://localhost:3000 访问应用。

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 阿里云 ECS 部署

详细的生产环境部署指南请参考 DEPLOYMENT.md 文档。该文档包含了阿里云 ECS 实例配置、Docker 安装、Nginx 反向代理设置、SSL 证书申请等完整步骤。建议生产环境使用 Nginx 作为反向代理，并配置 HTTPS 加密传输以确保数据安全。

## 项目结构

项目采用功能导向的目录结构组织代码，将相关功能的组件、钩子和工具函数集中在同一目录下。这种结构便于开发者快速定位和理解特定功能的实现，同时也简化了模块复用和测试的流程。

```
res2026/
├── src/
│   ├── app/                    # Next.js App Router 页面和 API Routes
│   │   ├── api/                # API Routes 端点
│   │   │   ├── reddit/         # Reddit API 代理端点
│   │   │   └── ai/             # AI 深度洞见端点
│   │   ├── layout.tsx          # 根布局组件
│   │   └── page.tsx            # 首页组件
│   ├── components/             # 通用 UI 组件库
│   │   └── ui/                 # Shadcn/UI 基础组件
│   ├── features/               # 功能模块
│   │   ├── topic-selection/    # 话题选择模块
│   │   │   ├── components/     # 搜索和列表组件
│   │   │   └── hooks/          # 搜索逻辑钩子
│   │   └── analysis/           # 分析模块
│   │       ├── components/     # 可视化组件
│   │       └── hooks/          # 分析流程钩子
│   ├── lib/                    # 基础支撑代码
│   │   ├── api/                # API 工具和类型定义
│   │   ├── ai/                 # 智谱AI集成
│   │   ├── workers/            # Web Worker 线程
│   │   ├── nlp.ts              # 自然语言处理
│   │   ├── errors.ts           # 错误处理模块
│   │   ├── types.ts            # 类型定义
│   │   └── utils.ts            # 工具函数
│   └── integration/            # 集成测试
├── Dockerfile                  # Docker 构建文件
├── docker-compose.yml          # 容器编排配置
├── package.json                # 项目依赖
├── next.config.mjs             # Next.js 配置
└── FRAMEWORK.md                # 框架文档
```

## API 参考

### API Routes 端点

项目通过以下 API Routes 端点提供后端服务，所有端点都经过服务端代理处理，确保 API 密钥安全。

**Subreddit 端点**（/api/reddit/subreddit）：提供 Subreddit 社区的搜索和信息查询功能，支持按名称搜索社区、获取社区详情和统计信息。请求参数包含搜索关键词和数量限制，返回匹配社区的详细信息列表。

**Search 端点**（/api/reddit/search）：提供帖子搜索功能，支持多维度筛选和时间范围限制。请求参数包含 Subreddit 名称、搜索关键词、排序方式和时间过滤，返回相关帖子的列表，每个帖子包含标题、摘要、评论数和发布时间等信息。

**Comments 端点**（/api/reddit/comments）：提供评论获取功能，支持分页加载和数量限制。请求参数包含帖子 ID 和评论数量限制，返回按热度排序的评论数组，每条评论包含作者、内容、发布时间和投票数等信息。

**AI Insights 端点**（/api/ai/insights）：提供 AI 深度洞见生成功能，调用智谱AI GLM-4 模型对分析结果进行深度解读。请求参数包含分析数据和洞察类型，返回结构化的深度分析报告，包含核心发现、用户痛点、需求趋势和行动建议。

### 自然语言处理模块

自然语言处理模块封装在 src/lib/nlp.ts 文件中，提供文本分析的核心功能。normalizeText 函数标准化输入文本，处理特殊字符、换行符和多余空格。tokenize 函数进行中英文分词，返回词素数组。removeStopwords 函数过滤停用词，保留实际语义词汇。extractKeywords 函数基于 TF-IDF 变体算法提取关键词，返回按重要性排序的关键词列表。analyzeSentiment 函数计算文本情感得分，返回 -1 到 1 之间的情感值。detectInsights 函数识别洞察模式并分类，返回包含痛点、建议和需求的洞察列表。

### Web Worker 模块

Web Worker 模块位于 src/lib/workers 目录下，提供并行计算能力。worker-manager.ts 负责 Worker 线程的创建、任务分发和结果回收。nlp.worker.ts 执行具体的 NLP 计算任务，包括分词、情感分析、关键词提取和洞察检测。这种架构将 CPU 密集型操作从主线程分离，避免阻塞 UI 渲染，显著提升用户体验。

## 测试

项目使用 Jest 和 React Testing Library 构建单元测试体系。测试文件分布在各功能模块的 __tests__ 目录下，与被测试的文件放在一起便于维护。执行以下命令运行测试。测试覆盖率报告会在终端输出，覆盖率阈值配置在 jest.config.js 中，核心逻辑的覆盖率要求达到 80% 以上。

```bash
# 运行所有测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 开发规范

### 代码风格

项目使用 ESLint 和 Prettier 强制代码风格统一。提交代码前请运行 lint 检查，确保代码符合项目规范。文件命名采用 kebab-case 风格，如 topic-search-input；组件名使用 PascalCase，如 TopicSearchInput；自定义钩子以 use 开头，如 useTopicSearch；API Routes 文件使用 route.ts 命名规范；Worker 文件以 .worker.ts 结尾，如 nlp.worker.ts。所有关键代码必须添加中文注释，说明函数目的、参数含义和实现思路。

### 安全注意事项

代码提交前请完成以下安全检查。首先检查 SQL 注入风险，确保所有用户输入都经过验证和转义，不使用字符串拼接构建查询。其次检查 XSS 风险，所有用户生成的内容在渲染前必须经过转义处理，React 默认的转义机制可以防范大部分 XSS 攻击。最后检查边界情况处理，确保程序能够正确处理空值、网络失败和超时等异常场景，不会因此崩溃或给出误导性结果。

API 密钥和敏感配置必须存储在服务端环境变量中，严禁写入前端代码或提交到版本控制系统。API Routes 应实现请求频率限制，防止单个用户过度消耗资源。敏感信息如 API 密钥必须存储在环境变量中，严禁写入代码仓库。生产环境配置使用 .env.production 模板，不直接提交包含真实值的配置文件。

## 文件统计

| 类型 | 数量 | 说明 |
|------|------|------|
| TypeScript 组件（.tsx） | 35 | UI 组件、功能模块组件和测试组件 |
| TypeScript 工具（.ts） | 22 | 钩子、API Routes、API 客户端、NLP 处理、Worker、错误处理 |
| 测试文件 | 12 | 单元测试和集成测试覆盖核心功能 |
| 配置文件 | 18 | 项目构建和测试配置 |
| 文档文件 | 5 | FRAMEWORK、CODE_DIRECTORY、README、DEPLOYMENT、TESTING |

## 版本历史

### v2.3.11（2026-01-18）

本版本完成了分析模块的可视化增强和测试体系完善。主要变更包括：

**可视化增强**：新增 InsightFilters 组件，提供洞察筛选功能；新增 InsightGraph 组件，以图谱形式展示洞察之间的关系；新增 InsightTrendChart 组件，支持洞察趋势可视化。

**趋势分析功能**：新增 useInsightTrend 钩子，负责洞察趋势数据的计算和聚合，支持按时间维度分析洞察变化。

**测试体系完善**：新增集成测试模块（src/integration/__tests__/user-flow.test.ts），覆盖用户流程测试；新增 UI 组件单元测试（Button、Card、Input），提升组件测试覆盖率。

**文件统计**：TypeScript 组件从 31 个增加到 35 个，TypeScript 工具从 19 个增加到 22 个，测试文件从 9 个增加到 12 个。

### v2.3.10（2026-01-17）

本版本完成了 AI 深度洞见功能的集成，通过智谱AI GLM-4 模型提供智能化的数据分析报告。主要变更包括：

**AI 集成**：新增智谱AI 客户端（zhipu-ai.ts），封装 GLM-4 API 调用逻辑；实现 JWT token 生成和请求签名机制；新增 Prompt 模板系统（prompts.ts），将分析结果转换为 AI 友好的格式。

**深度洞见功能**：创建 useDeepInsights 钩子，管理深度洞见生成状态；开发 DeepInsights 组件，展示 AI 生成的深度分析报告；支持 Markdown 格式渲染和折叠展开交互；新增深度洞见 API 路由（/api/ai/insights），处理服务端逻辑。

### v2.3.0（2026-01-18）

本版本完成了文档的全面更新，确保所有文档与代码库保持同步。主要变更包括：更新文件统计信息（29 个 TypeScript 组件，17 个 TypeScript 工具文件）；更新 API Routes 相关描述以反映最新的服务端代理架构；更新 Web Worker 架构说明以匹配当前的 Worker 线程实现；更新错误处理模块说明以匹配 errors.ts 的功能；更新单元测试覆盖范围说明。文档更新覆盖 FRAMEWORK.md、CODE_DIRECTORY.md 和 README.md 三个核心文档，确保新开发者能够快速理解项目架构和代码分布。Bug 修复包括修正了文档中不一致的文件路径和组件描述。

### v2.0.0（2026-01-15）

本版本完成了 Web Worker 并行计算和错误处理机制的实现，显著提升了项目的性能和稳定性。主要变更包括：新增 Web Worker 架构，将 NLP 计算移至独立线程；新增错误处理模块，统一错误类型和处理逻辑；新增 EmptyState 空状态组件；完善单元测试覆盖范围，新增 NLP Worker 测试。功能增强方面，优化了前端组件的状态管理和错误处理逻辑，改进了搜索建议的键盘导航体验。Bug 修复包括修复了搜索历史在某些情况下无法正确加载的问题，以及修复了分析进度在网络超时后未能正确重置的问题。

### v1.2.0（2026-01-12）

本版本完成了 API Routes 服务端代理层的实现，显著提升了项目的安全性和架构完整性。主要变更包括：新增 3 个 API Routes 端点（subreddit、search、comments），实现 Reddit API 的服务端代理；新增 fetch-helper 工具模块，提供统一的请求封装和错误处理逻辑；TypeScript 工具文件从 10 个增加到 14 个。功能增强方面，优化了前端组件的状态管理和错误处理逻辑，改进了搜索建议的键盘导航体验，完善了单元测试覆盖范围。

### v1.1.0（2026-01-10）

本版本完成了 Docker 容器化部署的支持，标志着项目具备了生产环境部署能力。主要变更包括：实现 Next.js standalone 构建模式，优化 Docker 镜像大小至约 100MB；配置非 root 用户运行容器，提升运行时安全性；实现健康检查和优雅重启机制，确保服务可用性；添加阿里云 ECS 部署文档和自动化脚本。功能增强方面，优化了 Reddit API 客户端的错误处理逻辑，新增请求取消机制和指数退避重试策略，改进了 NLP 模块的分词准确性，新增中文停用词支持，更新了 UI 组件库新增 Progress 和 Tooltip 组件。

### v1.0.0（2026-01-05）

初始版本发布，完成了核心功能的开发。包括话题搜索和筛选功能，支持 Subreddit 和帖子两种搜索维度；分析功能实现了评论获取、情感分析和关键词提取；洞察检测功能可识别用户反馈中的痛点和需求；UI 界面采用响应式设计，支持桌面和移动设备访问；单元测试覆盖率达到核心逻辑的 80% 以上。

## 贡献指南

欢迎对本项目进行贡献！您可以通过以下方式参与：提交 Issue 报告 Bug 或提出功能建议，提交 Pull Request 贡献代码修复或新功能，完善文档和测试用例。在提交代码前，请确保通过了所有测试和 lint 检查，并遵循项目的代码风格规范。详细的贡献流程请参考项目中的 CONTRIBUTING.md 文件。

## 许可证

本项目采用 MIT 许可证开源，您可以自由使用、修改和分发本项目的代码，但需要保留原始的版权声明和许可证文本。详细信息请参考 LICENSE 文件。
