# Reddit Insight Tool

Reddit Insight Tool 是一个功能强大的 Reddit 社区话题分析与洞察工具，旨在帮助用户快速发现热门话题、深入理解用户反馈并提取有价值的商业洞察。基于 Reddit API 构建，结合先进的自然语言处理技术，为用户提供直观易用的数据分析体验。

## 主要功能

本工具提供三大核心功能模块，分别对应用户旅程的不同阶段。

**话题选择模块**：负责 Reddit 数据的搜索与筛选。用户可以通过输入 Subreddit 名称或帖子关键词进行搜索，系统会实时返回相关的话题列表。每个话题以卡片形式展示，包含标题、摘要、评论数和发布时间等关键信息。支持防抖搜索、智能建议、批量选择等功能。

**分析模块**：负责对选中话题进行深度分析。分析流程首先自动抓取话题下的热门评论，然后对每条评论进行情感分析和关键词提取。情感分析将评论分为积极、消极和中性三类，并以可视化图表形式展示分布情况。洞察检测功能通过模式匹配算法识别用户反馈中的痛点描述、功能建议和需求表达（支持WISH信号检测）。**分析模块还提供丰富的可视化功能**：InsightFilters 支持按类型、情感和关键词筛选洞察；InsightGraph 以图谱形式展示洞察之间的关系；InsightTrendChart 展示洞察随时间变化的趋势；DeepInsights 集成智谱AI GLM-4模型，生成深度分析报告；优先级计算引擎基于Impact×Frequency×Urgency/Effort公式自动评估洞察优先级。

**产品吸引力评估模块**：基于可欲性三角模型（Desirability Triangle），分析用户评论中的身份契合度、问题紧急度和信任信号，评估产品对目标用户的吸引力。模块还能识别和分类7种类型的用户反对意见（信任、怀疑、价值、复杂度、身份不符、风险、拖延），为产品改进提供精准方向。

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

API Routes 位于 src/app/api 目录下，按功能模块划分为多个端点：

**Reddit API 代理端点**：
- `/api/reddit/subreddit` - Subreddit 社区搜索和信息查询
- `/api/reddit/search` - 帖子搜索，支持多维度筛选和时间范围限制
- `/api/reddit/comments` - 评论获取，支持分页加载和数量限制

**AI 分析服务端点**：
- `/api/ai/insights` - AI 深度洞见生成，调用智谱AI GLM-4 模型进行深度解读

**高级分析功能端点**：
- `/api/analysis/prioritize` - 优先级计算服务，基于Impact×Frequency×Urgency/Effort公式批量计算洞察优先级，返回4级优先级评估（Critical/High/Medium/Low）和建议行动方案
- `/api/analysis/appeal` - 产品吸引力评估服务，基于可欲性三角模型分析产品吸引力，返回身份契合度、问题紧急度、信任信号评分以及7类反对意见检测结果

**数据导出服务端点**：
- `/api/export` - 统一导出接口，支持多种格式
- `/api/export/excel` - Excel格式导出，生成包含完整分析数据的电子表格
- `/api/export/pdf` - PDF格式导出，生成美观的分析报告文档

fetch-helper 工具模块提供统一的请求封装和错误处理逻辑。每个端点都实现了完善的错误处理和请求验证，确保 API 的稳定性和可靠性。

## Web Worker 架构

为提升自然语言处理性能，项目采用 Web Worker 实现并行计算。Worker 线程位于 src/lib/workers 目录下，包含 worker-manager.ts 和 nlp.worker.ts 两个文件。worker-manager 负责 Worker 线程的创建、任务分发和结果回收，nlp.worker 执行具体的 NLP 计算任务。这种架构将 CPU 密集型操作从主线程分离，避免阻塞 UI 渲染，提升用户体验。

## 生产部署

### 方案一：Docker 本地部署

项目提供了完整的 Docker 部署支持，采用多阶段构建策略优化镜像大小。

```bash
# 构建 Docker 镜像
docker build -t reddit-insight-tool:latest .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

适合开发测试环境，无需公网访问。

### 方案二：Cloudflare + 阿里云部署 ⭐ 推荐

使用 Cloudflare 作为 CDN 和安全层，配合阿里云 ECS 部署，获得企业级性能和安全防护：

✅ **全球加速** - 200+ 数据中心，访问速度提升 50-70%  
✅ **安全防护** - 免费 DDoS、WAF、Bot 检测  
✅ **免费 SSL** - 自动证书管理  
✅ **成本节省** - 带宽节省 60-80%，仅需 ¥70-100/月

**快速开始：**
```bash
# 在 ECS 服务器上运行
./scripts/cloudflare-setup.sh
```

**完整文档：**
- 📖 [Cloudflare 部署完整指南](./CLOUDFLARE_DEPLOYMENT.md)
- ✅ [部署检查清单](./CLOUDFLARE_CHECKLIST.md)
- ⚡ [快速参考](./CLOUDFLARE_QUICK_REFERENCE.md)
- 📊 [架构对比](./DEPLOYMENT_ARCHITECTURE.md)

### 方案三：传统阿里云部署

详细的生产环境部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 文档。包含 ECS 实例配置、Docker 安装、Nginx 反向代理设置、SSL 证书申请等完整步骤。

## 项目结构

项目采用功能导向的目录结构组织代码，将相关功能的组件、钩子和工具函数集中在同一目录下。这种结构便于开发者快速定位和理解特定功能的实现，同时也简化了模块复用和测试的流程。

```
res2026/
├── src/
│   ├── app/                    # Next.js App Router 页面和 API Routes
│   │   ├── api/                # API Routes 端点
│   │   │   ├── reddit/         # Reddit API 代理端点
│   │   │   ├── ai/             # AI 深度洞见端点
│   │   │   ├── analysis/       # 高级分析端点（优先级、吸引力）
│   │   │   └── export/         # 数据导出端点
│   │   ├── layout.tsx          # 根布局组件
│   │   └── page.tsx            # 首页组件
│   ├── components/             # 通用 UI 组件库
│   │   └── ui/                 # Shadcn/UI 基础组件
│   ├── features/               # 功能模块
│   │   ├── topic-selection/    # 话题选择模块
│   │   │   ├── components/     # 搜索和列表组件
│   │   │   └── hooks/          # 搜索逻辑钩子
│   │   ├── analysis/           # 分析模块
│   │   │   ├── components/     # 可视化组件
│   │   │   ├── hooks/          # 分析流程钩子
│   │   │   └── utils/          # 分析工具类（情感模式、优先级计算）
│   │   └── product-appeal/     # 产品吸引力评估模块
│   │       ├── components/     # 评分和图谱组件
│   │       └── hooks/          # 吸引力分析钩子
│   ├── lib/                    # 基础支撑代码
│   │   ├── api/                # API 工具和类型定义
│   │   ├── ai/                 # AI集成（智谱AI、千问AI）
│   │   ├── workers/            # Web Worker 线程
│   │   ├── nlp.ts              # 自然语言处理
│   │   ├── errors.ts           # 错误处理模块
│   │   ├── types.ts            # 类型定义
│   │   └── utils.ts            # 工具函数
│   └── integration/            # 集成测试
├── electron/                   # Electron 桌面应用
│   ├── main.ts                 # 主进程
│   ├── preload.ts              # 预加载脚本
│   └── types.d.ts              # 类型定义
├── Dockerfile                  # Docker 构建文件
├── docker-compose.yml          # 容器编排配置
├── package.json                # 项目依赖
├── next.config.mjs             # Next.js 配置
├── FRAMEWORK.md                # 框架文档
├── CODE_DIRECTORY.md           # 代码目录
└── README.md                   # 项目说明
```

## API 参考

### API Routes 端点

项目通过以下 API Routes 端点提供后端服务，所有端点都经过服务端代理处理，确保 API 密钥安全。

**Reddit API 代理端点**：
- `/api/reddit/subreddit` - Subreddit 社区搜索和信息查询
- `/api/reddit/search` - 帖子搜索，支持多维度筛选和时间范围限制
- `/api/reddit/comments` - 评论获取，支持分页加载和数量限制

**AI 分析服务端点**：
- `/api/ai/insights` - AI 深度洞见生成，调用智谱AI GLM-4 模型进行深度解读

**高级分析功能端点**：
- `/api/analysis/prioritize` - 优先级计算服务，基于Impact×Frequency×Urgency/Effort公式批量计算洞察优先级，返回4级优先级评估（Critical/High/Medium/Low）和建议行动方案
- `/api/analysis/appeal` - 产品吸引力评估服务，基于可欲性三角模型分析产品吸引力，返回身份契合度、问题紧急度、信任信号评分以及7类反对意见检测结果

**数据导出服务端点**：
- `/api/export` - 统一导出接口，支持多种格式
- `/api/export/excel` - Excel格式导出，生成包含完整分析数据的电子表格
- `/api/export/pdf` - PDF格式导出，生成美观的分析报告文档

### 自然语言处理模块

自然语言处理模块封装在 src/lib/nlp.ts 文件中，提供文本分析的核心功能。normalizeText 函数标准化输入文本，处理特殊字符、换行符和多余空格。tokenize 函数进行中英文分词，返回词素数组。removeStopwords 函数过滤停用词，保留实际语义词汇。extractKeywords 函数基于 TF-IDF 变体算法提取关键词，返回按重要性排序的关键词列表。analyzeSentiment 函数计算文本情感得分，返回 -1 到 1 之间的情感值。detectInsights 函数识别洞察模式并分类，返回包含痛点、建议和需求的洞察列表。

### 情感模式与优先级计算

**情感模式定义（v2.6.0）**：sentiment-patterns.ts 定义了丰富的情感识别模式，包括：
- **WISH信号检测**：7类愿望表达模式（直接愿望、should语句、缺失表达、希望语句、期待表达、需求陈述、愿望名词）
- **反对意见分类**：7类反对意见模式（信任、怀疑、价值、复杂度、身份不符、风险、拖延）
- **身份信号提取**：用户身份描述和目标用户画像识别

**优先级计算引擎（v2.6.0）**：priority-calculator.ts 实现基于Impact×Frequency×Urgency/Effort公式的优先级计算：
- 影响分数（Impact）：基于情感强度和提及频率
- 频率分数（Frequency）：基于评论中出现次数
- 紧急度（Urgency）：基于关键词强度和情感色彩
- 努力度（Effort）：基于实现复杂度估算
- 输出4级优先级：Critical/High/Medium/Low

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
| TypeScript 组件（.tsx） | 38 | UI 组件、功能模块组件和测试组件 |
| TypeScript 工具（.ts） | 31 | 钩子、API Routes、API 客户端、NLP 处理、Worker、错误处理 |
| 测试文件 | 15 | 单元测试和集成测试覆盖核心功能 |
| 配置文件 | 19 | 项目构建和测试配置 |
| 文档文件 | 5 | FRAMEWORK、CODE_DIRECTORY、README、DEPLOYMENT、TESTING |

## 版本历史

### v2.6.0（2026-01-28）

本版本完成了基于Reddit分析技能集成的功能增强，显著提升洞察深度和产品分析能力。

**核心功能**：
- **WISH信号检测**：识别用户愿望和功能请求，提取紧急度评分（0-10）
- **智能分类系统**：7种子分类（Bug/性能/UX/定价/文档/集成/愿望）
- **优先级计算引擎**：基于Impact×Frequency×Urgency/Effort公式的自动优先级计算，提供4级评估
- **产品吸引力评估**：可欲性三角模型分析（身份契合度+问题紧急度+信任信号）
- **反对意见检测**：识别7类用户反对意见（信任/怀疑/价值/复杂度/身份不符/风险/拖延）
- **数据导出功能**：支持Excel和PDF格式导出

**技术亮点**：
- 新增9个API端点（Reddit 3个、AI分析1个、高级分析2个、导出3个）
- 新增product-appeal功能模块（3个组件 + hooks + API）
- 新增analysis/utils工具类（优先级计算器、情感模式定义）
- 新增千问AI客户端（qwen-ai.ts）
- 扩展Insight类型支持10+新字段
- 新增单元测试覆盖核心功能
- 文件总数达到84个

### v2.5.0（2026-01-27）

洞察增强版：新增洞察筛选、关系图、趋势分析等可视化功能。

### v2.4.0（2026-01-19）

AI深度洞见版：集成智谱AI GLM-4模型，提供智能化的数据分析报告。

### v2.3.0（2026-01-18）

性能优化版：关键词提取模块性能提升60-80%，1000条评论处理时间从8-10秒降至3-4秒。

### v2.2.0（2026-01-18）

话题选择优化版：新增防抖搜索、智能建议、分类显示、批量选择等功能。

### v2.0.0（2026-01-15）

Web Worker版：新增Web Worker并行计算架构，提升NLP处理性能。

### v1.2.0（2026-01-12）

API代理版：新增API Routes服务端代理层，提升安全性。

### v1.1.0（2026-01-10）

Docker部署版：新增Docker容器化部署支持。

### v1.0.0（2026-01-05）

初始版本发布，完成核心功能开发。

## 贡献指南

欢迎对本项目进行贡献！您可以通过以下方式参与：提交 Issue 报告 Bug 或提出功能建议，提交 Pull Request 贡献代码修复或新功能，完善文档和测试用例。在提交代码前，请确保通过了所有测试和 lint 检查，并遵循项目的代码风格规范。详细的贡献流程请参考项目中的 CONTRIBUTING.md 文件。

## 许可证

本项目采用 MIT 许可证开源，您可以自由使用、修改和分发本项目的代码，但需要保留原始的版权声明和许可证文本。详细信息请参考 LICENSE 文件。
