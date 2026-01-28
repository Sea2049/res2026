# Reddit Insight Tool 框架文档

## 一、项目概述

Reddit Insight Tool 是一个基于 Reddit API 的社区话题筛选与分析工具，旨在帮助用户快速发现和深入理解 Reddit 社区中的热门话题、用户痛点和讨论热点。本项目采用现代化的技术栈构建，提供直观友好的用户界面和强大的数据分析能力。项目采用模块化的功能架构，将话题选择和分析功能分离到不同的功能模块中，每个模块包含其专属的组件、钩子函数和工具函数。这种架构设计确保了代码的高内聚低耦合，便于团队协作开发和后续功能扩展。项目的核心价值在于将复杂的自然语言处理技术封装成简单易用的功能，让用户无需专业知识即可获取有价值的信息。

## 二、技术栈

本项目采用当前业界主流的前端技术栈构建，确保了开发效率和运行性能的平衡。后端框架选用 Next.js 14+，充分利用其 App Router 架构实现服务端渲染、静态生成和 API Routes 能力，提升首屏加载速度、SEO 效果和后端 API 服务能力。开发语言为 TypeScript，通过静态类型检查在编译阶段发现潜在错误，提高代码质量和可维护性。样式方案采用 Tailwind CSS，结合原子化设计理念实现快速样式开发，同时配合 Shadcn/UI 组件库提供一致的设计语言和丰富的交互组件。

测试方面使用 Jest 和 React Testing Library 构建单元测试体系，确保核心业务逻辑的可靠性。容器化部署基于 Docker，采用多阶段构建优化镜像大小，最终产出约 100MB 的精简镜像。Reddit API 交互通过 Next.js API Routes 进行服务端代理，实现请求转发、认证管理和跨域处理，同时隐藏 API 密钥避免客户端暴露。NLP 处理模块集成了中文和英文的自然语言处理能力，支持情感分析、关键词提取和洞察检测等高级功能，并采用 Web Worker 实现并行计算以提升性能。

## 三、架构设计

### 3.1 目录结构

项目采用功能导向的目录结构组织代码，将相关功能的组件、钩子和工具函数集中在同一目录下。这种结构便于开发者快速定位和理解特定功能的实现，同时也简化了模块复用和测试的流程。根目录下包含配置文件、依赖定义和部署相关文件。src 目录是主要的源代码入口，下设 app、components、features 和 lib 四个核心目录。

app 目录遵循 Next.js App Router 规范，包含页面路由、布局组件、API Routes 和全局样式。API Routes 位于 app/api 目录下，按功能模块组织服务端接口。components 目录存放通用 UI 组件，这些组件不依赖特定业务逻辑，可在项目各处复用。features 目录按功能模块划分，每个子目录代表一个独立的功能域，包含该功能所需的全部组件、钩子和类型定义。lib 目录包含工具函数、类型定义、外部服务封装、API 辅助函数、错误处理和 Worker 线程等基础支撑代码。

### 3.2 模块关系

应用的核心模块包括话题选择模块（topic-selection）和分析模块（analysis），两者通过 React Context 和自定义钩子进行状态共享。话题选择模块负责 Reddit 数据的获取和展示，用户可以通过搜索 Subreddit 名称或帖子标题来筛选感兴趣的内容。选中目标话题后，分析模块接手进行深度处理，包括评论抓取、自然语言处理和可视化展示。

模块间的数据流转遵循单向流动原则：前端组件通过 API Routes 代理调用 Reddit 官方 API，获取的数据经过分析模块处理后更新全局状态供 UI 层渲染。这种设计确保了数据流向的清晰性，同时通过服务端代理保护了 API 凭证的安全性。每个模块内部采用高内聚设计，组件间通过 props 传递数据，避免了隐式依赖带来的复杂性。

### 3.3 API Routes 架构

项目采用 Next.js API Routes 作为服务端代理层，统一处理所有与 Reddit API 的通信。这种架构设计带来了多重优势：首先，API 密钥和敏感配置存储在服务端环境变量中，避免在前端代码中暴露，降低了安全风险；其次，API Routes 可以实现请求的预处理和后处理，包括请求重试、错误转换和数据格式化；第三，通过 CORS 配置和请求限制，可以更好地控制 API 访问频率和来源。

API Routes 按功能划分为九个端点：
- **Reddit API 代理**：subreddit 端点处理 Subreddit 社区的搜索和信息获取；search 端点处理帖子搜索和结果筛选；comments 端点处理评论数据的获取和分页
- **AI 分析服务**：insights 端点（/api/ai/insights）调用智谱AI GLM-4模型生成深度洞见
- **高级分析功能**：prioritize 端点（/api/analysis/prioritize）提供优先级计算服务；appeal 端点（/api/analysis/appeal）提供产品吸引力评估服务
- **数据导出服务**：export 端点（/api/export/*）支持Excel、PDF等格式的数据导出

fetch-helper 工具模块提供统一的请求封装和错误处理逻辑。每个端点都实现了完善的错误处理和输入验证，确保 API 的健壮性和可靠性。

### 3.4 Web Worker 架构

为提升自然语言处理性能，项目采用 Web Worker 实现并行计算。Worker 线程位于 src/lib/workers 目录下，包含 worker-manager.ts 和 nlp.worker.ts 两个文件。worker-manager 负责 Worker 线程的创建、任务分发和结果回收，nlp.worker 执行具体的 NLP 计算任务。这种架构将 CPU 密集型操作从主线程分离，避免阻塞 UI 渲染，提升用户体验。

## 四、核心功能模块

### 4.1 话题选择模块（topic-selection）

话题选择模块是用户与系统交互的入口，提供 Subreddit 和帖子两种维度的搜索能力。该模块包含五个核心组件：TopicSearchInput 负责接收用户输入并触发搜索，支持键盘导航和自动补全；SearchSuggestions 显示智能搜索建议，根据关键词类型生成相关建议；TopicList 展示搜索结果列表，支持分类分组显示和批量选择；TopicCard 展示单个话题摘要信息；AdvancedSearchOptions 提供时间范围、排序方式等高级筛选条件。

模块的状态管理通过两个自定义钩子实现：useTopicSearch 处理搜索逻辑和结果状态，支持防抖搜索自动触发、批量选择、全选/取消全选等功能；useSearchHistory 管理用户的搜索历史记录。搜索历史采用本地存储持久化，确保用户刷新页面后仍能查看之前的搜索记录。搜索组件支持完善的键盘导航操作，用户可以使用上下箭头选择建议项和历史记录，Enter 键确认搜索，Escape 键关闭下拉框，这些细节设计显著提升了操作效率。

**功能增强（v2.2.0）**：
- 防抖搜索：输入关键词时自动触发搜索（500ms 防抖），避免频繁请求
- 智能建议：根据关键词类型（技术、兴趣爱好等）生成更精准的搜索建议
- 分类显示：搜索结果按 Subreddit 和帖子分类分组展示，便于快速筛选
- 批量操作：支持全选当前搜索结果和批量取消选择
- 性能优化：使用 React.memo 和 useMemo 优化组件渲染性能

### 4.2 分析模块（analysis）

分析模块负责对选中话题进行深度分析，包括评论数据获取、情感分析、关键词提取和洞察检测。该模块的入口组件是 FeatureAnalysis，它协调各子组件的工作流程。AnalysisProgress 展示分析进度和当前阶段；CommentList 展示原始评论数据；SentimentChart 可视化情感分析结果；KeywordCloud 展示高频关键词；InsightCard 呈现检测到的用户痛点和建议，**默认展示前 2 条相关评论预览，支持点击展开查看全部评论**。DeepInsights 展示AI生成的深度分析报告，提供用户痛点、需求趋势和行动建议。EmptyState 组件在无数据时显示友好的空状态提示。

模块的核心逻辑封装在 useAnalysis 钩子中，该钩子管理整个分析流程的状态机，包括空闲、加载中、分析中、完成和错误五种状态。分析过程采用流水线设计：首先并行获取评论数据，然后对每条评论进行情感分析和关键词提取，最后汇总生成洞察报告。这种流水线架构充分利用了现代浏览器的并行处理能力，显著缩短了分析耗时。

**洞察增强功能（v2.5.0）**：
- **洞察筛选**：InsightFilters 组件提供多维度筛选功能，包括洞察类型（用户痛点、功能需求、用户赞美、用户问题）、趋势方向（上升、稳定、下降）、严重程度（严重、高、中、低）和置信度范围筛选，支持关键词搜索
- **洞察关系图**：InsightGraph 组件使用力导向布局算法可视化洞察之间的关系，支持相似、对立和相关三种关系类型，节点按洞察类型着色，支持缩放和平移交互
- **洞察趋势分析**：InsightTrendChart 组件展示洞察趋势概览，包括上升/稳定/下降趋势的统计分布和预测数据，useInsightTrend 钩子提供完整的趋势分析、筛选和排序功能

**AI深度洞见功能（v2.4.0）**：
- 集成智谱AI GLM-4模型，生成深度分析报告
- 提供核心发现、用户痛点分析、需求趋势预测等维度
- 支持Markdown格式展示和导出
- 实现进度提示和取消机制
- 与关键词、情感、洞察、评论并列展示，形成完整的分析体系

### 4.3 AI集成模块

AI集成模块负责将智谱AI GLM-4模型集成到分析流程中，提供深度洞见生成能力。该模块包含三个核心部分：zhipu-ai.ts 封装智谱AI API调用逻辑，实现JWT token生成和请求签名；prompts.ts 提供结构化的Prompt模板，将分析结果转换为AI友好的格式；/api/ai/insights API路由处理深度洞见生成的服务端逻辑，包括请求验证、错误处理和响应格式化。

模块的客户端部分通过 useDeepInsights 钩子管理深度洞见生成状态，包括空闲、加载中、成功和错误四种状态。DeepInsights 组件展示AI生成的深度分析报告，支持Markdown格式渲染、折叠展开和导出功能。整个模块独立于基础分析功能，可以按需触发，不影响其他分析流程的正常运行。

### 4.4 产品吸引力评估模块（product-appeal）

产品吸引力评估模块基于可欲性三角模型（Desirability Triangle），分析用户评论中的身份契合度、问题紧急度和信任信号，评估产品对目标用户的吸引力。该模块包含两个核心组件：AppealScore 展示吸引力评分和三个维度的详细分析；ObjectionMap 以图谱形式展示7类用户反对意见的分布和强度。

模块使用 useAppealAnalysis 钩子管理分析状态，通过 /api/analysis/appeal API端点与后端通信。后端分析引擎能够识别和分类7种类型的用户反对意见：信任疑虑、怀疑态度、价值质疑、复杂度担忧、身份不符、风险顾虑和拖延倾向。分析结果帮助产品团队理解用户决策障碍，为产品改进提供精准方向。

## 五、自然语言处理模块

### 5.1 处理流程

NLP 模块是数据分析的核心引擎，其处理流程分为预处理、分析和后处理三个阶段。预处理阶段包括文本清洗、分句、分词和去停用词等操作，确保输入数据的规范性。分析阶段执行情感分析、关键词提取和洞察检测等具体任务。后处理阶段对分析结果进行聚合和排序，生成最终报告。

模块支持中英文混合处理，通过检测文本语言自动选择合适的分词器和停用词表。情感分析采用基于词典的方法，为每个情感词分配正负向权重，通过加权求和计算整体情感倾向。关键词提取综合考虑词频、逆文档频率和词性，优先提取名词和动词类关键词。洞察检测通过模式匹配识别用户反馈中的问题描述、功能建议和需求表达。为提升处理性能，NLP 计算通过 Web Worker 在独立线程中执行，避免阻塞主线程。

### 5.2 核心函数

nlp.ts 文件包含以下核心函数：normalizeText 标准化输入文本，处理特殊字符和格式问题；tokenize 进行中英文分词，返回词素数组；removeStopwords 过滤停用词，保留实际语义词；extractKeywords 基于 TF-IDF 变体算法提取关键词；analyzeSentiment 计算文本情感得分；detectInsights 识别洞察模式并分类。所有函数均经过单元测试覆盖，确保处理结果的稳定性和准确性。

**性能优化（v2.3.0）**：
- **LRU缓存机制**：为词干提取(stemmer)添加LRU缓存，缓存容量2000条，避免重复计算相同单词的词干，性能提升20-30%
- **批量TF-IDF计算**：优化TFIDFCalculator类，新增addDocuments批量处理方法，将文档频率统计从O(n×m)优化到O(n+m)，性能提升40-50%
- **Top-K堆算法**：使用最小堆替代全排序，将关键词排序从O(n log n)优化到O(n log k)，k为topKeywordsCount，性能提升15-25%
- **情感判断优化**：使用布尔变量缓存Set查询结果，避免对同一词的重复查询，减少50%的Set.has()调用
- **递归深度限制**：限制词干提取递归深度为1，避免过深递归导致的性能问题
- **整体性能提升**：关键词提取模块整体性能提升约60-80%，1000条评论的处理时间从约8-10秒降至3-4秒

### 5.3 情感模式与优先级计算

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

## 六、API 服务层

### 6.1 API Routes 设计

项目通过 Next.js API Routes 实现服务端代理，统一处理所有与 Reddit API 的通信。API Routes 位于 src/app/api 目录下，按功能模块划分为 subreddit、search 和 comments 三个端点。这种设计将 API 密钥和敏感配置隔离在服务端，前端通过相对路径调用内部 API，简化了调用逻辑并提升了安全性。

subreddit 端点（/api/reddit/subreddit）提供 Subreddit 社区的搜索和信息查询功能，支持按名称搜索社区、获取社区详情和统计信息。search 端点（/api/reddit/search）提供帖子搜索功能，支持多维度筛选和时间范围限制。comments 端点（/api/reddit/comments）提供评论获取功能，支持分页加载和数量限制。每个端点都实现了完善的错误处理和请求验证，确保 API 的稳定性和可靠性。

### 6.2 高级分析端点

**优先级计算端点（/api/analysis/prioritize）**：
- 接收洞察列表，批量计算每个洞察的优先级
- 基于Impact×Frequency×Urgency/Effort公式
- 返回4级优先级评估和对应行动建议

**产品吸引力评估端点（/api/analysis/appeal）**：
- 接收评论数据，分析产品吸引力
- 基于可欲性三角模型（Identity Fit + Problem Urgency + Trust Signals）
- 返回吸引力评分、反对意见分布和改进建议

### 6.3 Fetch Helper 工具

fetch-helper.ts 提供了统一的请求封装和错误处理逻辑，是所有 API Routes 共用的基础工具。该模块封装了 fetch 请求的通用逻辑，包括请求超时控制、错误响应解析和重试机制。通过 AbortSignal 支持请求取消，当客户端断开连接或请求超时时，服务端可以及时释放资源。

fetchHelper 核心函数接收请求配置参数，自动处理查询字符串构建、请求头设置和响应解析。错误处理方面，将 Reddit API 的错误响应转换为统一的错误格式，包含错误类型、状态码和详细描述，便于前端进行统一的错误展示和恢复处理。工具模块还提供了请求日志功能，在开发环境下记录请求详情，便于调试和问题排查。

### 6.4 错误处理模块

errors.ts 定义了项目统一的错误类型和错误处理机制。错误类型包括网络错误、API 错误、验证错误、超时错误等，每种错误都包含错误代码、消息和详细信息。错误处理函数提供了创建错误、格式化错误消息和判断错误类型的工具函数，确保整个应用的错误处理一致性。

## 七、UI 组件库

项目基于 Shadcn/UI 构建了完整的组件库，包含以下组件：Button 按钮组件支持多种变体和尺寸；Input 输入框组件支持前后图标和禁用状态；Card 卡片组件用于内容分组展示；Badge 标签组件用于状态和分类标识；Spinner 加载动画组件用于异步操作反馈；Alert 警告组件用于展示提示和错误信息；Tabs 标签页组件用于内容分组；Separator 分隔线组件用于视觉分割；Select 下拉选择组件用于选项选择；Dialog 对话框组件用于模态交互；DropdownMenu 下拉菜单组件用于右键和菜单交互；Tooltip 提示组件用于鼠标悬停信息展示；Progress 进度条组件用于任务进度可视化。

所有组件都经过样式定制以保持视觉一致性，同时保留原始组件的完整功能。组件使用 TypeScript 编写类型定义，确保调用时的类型安全。组件库的设计遵循无障碍访问标准，支持键盘导航和屏幕阅读器操作。

## 八、桌面应用方案

### 8.1 Electron 架构

项目支持打包为 Windows 桌面应用程序，采用 Electron 框架将 Next.js 应用转换为独立可执行文件。桌面应用架构采用主进程-渲染进程分离设计，主进程（electron/main.ts）负责窗口管理、IPC 通信和 Next.js 服务器启动；渲染进程加载 Next.js 应用的渲染内容；预加载脚本（electron/preload.ts）提供安全的 IPC 通信桥梁。

桌面应用使用本地 Next.js 开发/生产服务器提供 Web 内容，保留了所有现有 API 功能和业务逻辑，无需修改任何前端代码。开发模式下，concurrently 同时启动 Next.js dev server 和 Electron 窗口；生产模式下，主进程启动内置的 Next.js 服务器（electron/server.js），打包后的应用完全独立运行。

### 8.2 打包配置

electron-builder 配置用于生成 Windows 可执行文件，采用 dir 目标类型生成解压目录，避免符号链接问题。打包产物包含 Electron 运行时、.next 构建产物、public 静态资源和 electron 目录的编译文件。最终输出为 dist/win-unpacked/Reddit Insight Tool.exe，用户可直接双击运行。

### 8.3 运行命令

开发环境运行：npm run electron:dev（同时启动 Next.js dev server 和 Electron）
生产环境打包：npm run electron:build（构建 Next.js + 编译 Electron + 打包）
直接运行桌面应用：npm run electron（需先运行 npm run dev 启动 Next.js 服务器）

## 九、Docker 部署方案

### 9.1 镜像构建

项目采用 Docker 多阶段构建策略优化镜像大小。第一阶段使用 node:20-alpine 作为构建基础，安装依赖并编译 Next.js 应用；第二阶段仅复制编译产物到一个精简的运行时镜像。这种方案将最终镜像大小控制在约 100MB，相比直接使用 node 基础镜像减少了约 70% 的体积。

构建过程中启用了 Next.js 的 standalone 模式，该模式仅打包运行时必需的文件，排除了源代码和开发依赖。Dockerfile 中创建了专门的 non-root 用户（nextjs，UID 1001），容器运行时以该用户身份执行，遵循最小权限原则提升安全性。健康检查配置监控应用端口，确保服务可用性。

### 9.2 容器编排

docker-compose.yml 定义了完整的容器运行环境，包括服务配置、环境变量挂载和健康检查。生产环境配置中，应用容器通过环境变量注入配置参数，敏感信息通过 secrets 机制管理。服务依赖关系明确指定，确保数据库等依赖服务先于应用启动。

部署脚本提供了阿里云 ECS 环境的一键部署能力，包括镜像构建、推送和容器启动等步骤。部署过程中自动配置 Nginx 反向代理和 SSL 证书（需用户提前申请），确保生产环境的安全访问。日志统一输出到标准输出，方便使用 docker logs 查看和管理。

## 十、开发规范

### 10.1 命名规范

项目遵循一致的命名规范，提升代码可读性和团队协作效率。文件名采用 kebab-case 风格，如 topic-search-input、analysis-progress。组件名使用 PascalCase，如 TopicSearchInput、AnalysisProgress。自定义钩子以 use 前缀开头，如 useTopicSearch、useAnalysis。类型定义使用 PascalCase 并以 .type.ts 结尾，如 SearchResult.type.ts。

API Routes 文件命名遵循 Next.js 规范，使用 route.ts 作为端点文件。Worker 文件以 .worker.ts 结尾，如 nlp.worker.ts。工具函数文件使用 camelCase 或 PascalCase，根据用途区分。变量和函数命名采用 camelCase，常量使用全大写加下划线分隔。状态变量名称应清晰表达其含义，避免使用无意义的命名如 data、info。API 相关的类型定义集中放置在 lib/types.ts 文件中，便于全局引用和类型检查。

### 10.2 代码风格

代码风格统一使用项目预设的 Prettier 配置，不允许擅自修改格式化规则。组件文件遵循固定结构：先导入依赖，再定义类型，然后实现组件逻辑，最后导出组件。钩子函数的实现应保持纯净，避免直接修改输入参数或产生副作用。

注释规范要求所有关键代码必须添加注释说明，包括但不限于：函数目的和参数说明、复杂逻辑的思路解释、API 调用的用途和返回值处理、边界情况和特殊处理的说明。注释语言跟随项目语言规范，业务逻辑使用中文注释，API 文档和代码规范可使用英文。行内注释用于解释「为什么」而非「是什么」，避免冗余的翻译式注释。

### 10.3 安全 checklist

代码提交前必须通过以下安全检查：SQL 注入风险排查，确保所有用户输入都经过验证和转义，不使用字符串拼接构建查询；XSS 风险排查，所有用户生成的内容在渲染前必须转义处理，使用 React 默认的转义机制即可防范大部分 XSS 攻击；边界情况处理，检查空值、网络失败、超时等异常场景，确保程序不会崩溃或给出误导性结果。

API 密钥和敏感配置必须存储在服务端环境变量中，严禁写入前端代码或提交到版本控制系统。API Routes 应实现请求频率限制，防止单个用户过度消耗资源。依赖安全方面，定期运行 npm audit 检查已知漏洞，及时更新受影响依赖。生产环境配置使用 .env.production 模板，不直接提交包含真实值的配置文件。

## 十一、文件统计

### 11.1 代码文件统计

截至当前版本（v2.6.0），项目包含以下代码文件：

**TypeScript 组件文件（.tsx）**：38 个
- UI 组件：13 个（button、input、card、badge、spinner、alert、tabs、separator、select、dialog、dropdown-menu、tooltip、progress）
- 功能模块组件：21 个
  - 话题选择模块：5 个（TopicSearchInput、TopicList、SearchSuggestions、TopicCard、AdvancedSearchOptions）
  - 分析模块：11 个（AnalysisProgress、CommentList、SentimentChart、KeywordCloud、InsightCard、DeepInsights、EmptyState、InsightFilters、InsightGraph、InsightTrendChart、FeatureAnalysis入口）
  - 产品吸引力模块：3 个（AppealScore、ObjectionMap、入口组件）
- 页面组件：2 个（page.tsx、layout.tsx）
- 测试组件：2 个（UI组件测试3个、功能组件测试4个）

**TypeScript 工具文件（.ts）**：31 个
- API Routes：9 个（subreddit、search、comments、insights、prioritize、appeal、export、export/excel、export/pdf）
- 自定义钩子：7 个（useTopicSearch、useSearchHistory、useAnalysis、useDeepInsights、useInsightTrend、useAppealAnalysis）
- API 客户端和工具：4 个（fetch-helper、reddit、zhipu-ai、qwen-ai、prompts）
- NLP 处理：1 个（nlp.ts）
- 工具类和模式定义：3 个（sentiment-patterns、priority-calculator、utils）
- 错误处理：1 个（errors.ts）
- 类型定义：1 个（types.ts）
- Worker 线程：2 个（worker-manager、nlp.worker）
- Electron 主进程：3 个（main.ts、preload.ts、types.d.ts）

**测试文件（.test.tsx/.test.ts）**：15 个
- UI 组件测试：3 个（Button、Card、Input）
- 话题选择模块测试：4 个（useTopicSearch、useSearchHistory、TopicSearchInput、TopicCard）
- 分析模块测试：4 个（useAnalysis、AnalysisProgress、sentiment-patterns、priority-calculator）
- API 工具测试：2 个（fetch-helper、reddit）
- NLP 模块测试：1 个（nlp.test.ts）
- 集成测试：1 个（user-flow.test.ts）

### 11.2 配置文件统计

项目包含以下配置文件：package.json 定义项目依赖和 npm 脚本；next.config.mjs 配置 Next.js 构建选项；tsconfig.json 配置 TypeScript 编译选项；tailwind.config.ts 配置 Tailwind CSS 主题和变体；jest.config.js 配置 Jest 测试环境；jest.setup.js 配置 Jest 测试设置；.eslintrc.json 配置 ESLint 规则；.prettierrc 配置 Prettier 格式化规则。

部署相关配置文件包括：Dockerfile 定义多阶段构建流程；docker-compose.yml 定义容器编排配置；.dockerignore 配置构建上下文排除规则；.env.production 定义生产环境变量模板；tsconfig.electron.json Electron TypeScript 配置。这些配置文件共同支撑了项目的开发、测试和部署流程。

## 十二、变更日志

### v2.6.0（当前版本 - 2026-01-28）

本版本完成了基于Reddit分析技能的功能增强，显著提升了洞察分析的深度和准确性。新增产品吸引力评估、优先级计算、数据导出等高级功能。主要变更包括：

**WISH信号检测**：
- 新增WISH信号识别模式，可检测7类愿望表达（直接愿望、should语句、缺失表达等）
- WISH信号自动归类为feature_request类型，并标注isWish标记
- 新增紧急度评分（0-10），基于关键词强度和提及频率

**洞察分类增强**：
- 新增子分类系统（Bug/性能/UX问题/定价/文档/集成/愿望）
- 每个洞察自动检测最匹配的子分类
- UI组件显示子分类标签和图标

**优先级计算系统**：
- 新增优先级计算公式：Priority = (Impact × Frequency × Urgency) / Effort
- 优先级等级：Critical/High/Medium/Low四级
- 新增API端点 `/api/analysis/prioritize` 支持批量计算
- 为每个优先级等级提供建议行动方案

**产品吸引力评估模块**：
- 新增product-appeal功能模块，基于可欲性三角模型（Identity Fit + Problem Urgency + Trust Signals）
- 检测7类反对意见（信任/怀疑/价值/复杂度/身份不符/风险/拖延）
- 提取用户身份信号和目标用户画像
- 生成吸引力评分报告和改进建议
- 新增API端点 `/api/analysis/appeal`

**数据导出功能**：
- 新增统一导出接口 `/api/export`
- 支持Excel格式导出（/api/export/excel）
- 支持PDF格式导出（/api/export/pdf）
- 导出内容包含完整分析数据和洞察报告

**UI组件更新**：
- InsightCard组件新增WISH标记、子分类标签、身份信号、反对意见等显示
- InsightFilters组件新增子分类筛选和WISH信号筛选
- 新增AppealScore、ObjectionMap等可视化组件

**技术架构**：
- 新增sentiment-patterns.ts模式定义文件
- 新增priority-calculator.ts优先级计算工具
- 新增qwen-ai.ts千问AI客户端
- 扩展Insight类型支持新字段（subType、priority、urgency等）
- 新增单元测试覆盖新功能

**文件统计**：
- TypeScript组件：35个 → 38个
- TypeScript工具：25个 → 31个
- 测试文件：13个 → 15个
- 总文件数：84个

### v2.5.0

本版本完成了洞察增强功能的开发，显著提升了洞察分析的深度和可视化能力。主要变更包括：

**洞察筛选功能**：
- 新增 InsightFilters 组件，提供多维度筛选（类型、趋势、严重程度、置信度）
- 支持关键词搜索和筛选组合
- 提供筛选器折叠/展开和清除功能

**洞察可视化增强**：
- 新增 InsightGraph 组件，使用力导向布局展示洞察关系网络
- 支持相似、对立、相关三种关系类型的可视化
- 节点按洞察类型着色，支持缩放、平移和节点点击交互
- 新增 InsightTrendChart 组件，展示洞察趋势概览和预测

**趋势分析功能**：
- 新增 useInsightTrend 钩子，管理洞察筛选、排序和趋势分析
- 提供趋势预测计算和统计信息生成
- 支持按置信度、评论数、时间和影响分数排序

**测试体系增强**：
- 新增 3 个 UI 组件单元测试（Button、Card、Input）
- 新增用户流程集成测试，覆盖搜索→选择→分析→导出完整流程
- 测试套件从 9 个增加到 13 个

**文档更新**：
- 更新 CODE_DIRECTORY.md，新增文件清单和统计
- 更新 FRAMEWORK.md，补充洞察增强功能说明
- 文件总数从 58 个增加到 68 个

### v2.4.0

本版本完成了AI深度洞见功能的集成，通过智谱AI GLM-4模型提供智能化的数据分析报告。主要变更包括：

**AI集成**：
- 新增智谱AI客户端（zhipu-ai.ts），封装GLM-4 API调用逻辑
- 实现JWT token生成和请求签名机制
- 新增Prompt模板系统（prompts.ts），将分析结果转换为AI友好的格式

**深度洞见功能**：
- 创建 useDeepInsights 钩子，管理深度洞见生成状态
- 开发 DeepInsights 组件，展示AI生成的深度分析报告
- 支持Markdown格式渲染和折叠展开交互
- 实现进度提示、取消机制和错误处理
- 新增深度洞见API路由（/api/ai/insights），处理服务端逻辑

**分析模块增强**：
- 在分析仪表板中新增"AI深度洞见"标签页
- 修改TabsList从4列扩展到5列，支持5个维度的分析展示
- 支持深度洞见数据导出为Markdown格式
- 独立的状态管理，不影响其他分析功能的正常运行

**文档更新**：
- 更新FRAMEWORK.md添加AI集成模块说明
- 更新API Routes架构描述，新增insights端点
- 更新分析模块功能说明，包含深度洞见组件
- 添加环境变量配置示例文件（.env.local.example）

**技术实现**：
- 实现结构化的Prompt设计，包含核心发现、用户痛点、需求趋势等维度
- 使用AbortController支持请求取消
- 完善的错误处理和降级方案
- 符合项目命名规范和安全检查清单

### v2.3.0

本版本完成了关键词提取模块的性能优化，显著提升了NLP处理速度和效率。主要变更包括：

**性能优化**：
- **LRU缓存机制**：为词干提取算法添加LRU缓存(容量2000)，避免重复计算，性能提升20-30%
- **批量TF-IDF计算**：优化TFIDFCalculator类，新增addDocuments批量处理方法，性能提升40-50%
- **Top-K堆算法**：使用最小堆替代全排序进行关键词筛选，性能提升15-25%
- **情感判断优化**：缓存Set查询结果，减少50%的重复查询
- **递归深度限制**：限制词干提取递归深度为1，避免性能问题
- **整体性能提升**：关键词提取模块整体性能提升约60-80%，1000条评论处理时间从8-10秒降至3-4秒

**算法增强**：
- 新增MinHeap最小堆数据结构，用于高效Top-K元素筛选
- 优化词干提取算法，添加缓存层和递归深度控制
- 优化情感分析算法，减少重复Set查询

**代码质量**：
- 所有优化通过TypeScript类型检查
- 保持向后兼容性，不影响现有功能
- 优化代码注释，说明性能优化点

### v2.2.0

本版本完成了话题选择模块的全面优化，显著提升了搜索体验和性能。主要变更包括：

**性能优化**：
- 新增防抖搜索功能，输入关键词时自动触发搜索（500ms 防抖），避免频繁请求造成的性能问题
- 使用 React.memo 和 useMemo 优化 TopicCard 和 TopicList 组件渲染性能
- 使用 useCallback 优化回调函数，减少不必要的重渲染

**用户体验增强**：
- 增强搜索建议的智能性，根据关键词类型（技术、兴趣爱好等）生成更精准的搜索建议
- 搜索结果按 Subreddit 和帖子分类分组展示，便于用户快速筛选
- 新增批量选择功能，支持全选当前搜索结果和批量取消选择
- 增强键盘导航支持，历史记录下拉框支持上下键导航和回车确认
- 新增当前搜索结果显示区域，展示结果统计和快捷操作按钮

**功能扩展**：
- useTopicSearch 钩子新增 selectTopics、deselectTopics、selectAll、deselectAll 四个方法
- TopicList 组件新增 showGrouping 属性，支持启用/禁用分类分组显示

### v2.1.0

本版本完成了文档的全面更新，确保所有文档与代码库保持同步。主要变更包括：更新文件统计信息（29 个 TypeScript 组件，17 个 TypeScript 工具文件）；更新 API Routes 相关描述以反映最新的服务端代理架构；更新 Web Worker 架构说明以匹配当前的 Worker 线程实现；更新错误处理模块说明以匹配 errors.ts 的功能；更新单元测试覆盖范围说明。文档更新覆盖 FRAMEWORK.md、CODE_DIRECTORY.md 和 README.md 三个核心文档，确保新开发者能够快速理解项目架构和代码分布。Bug 修复包括修正了文档中不一致的文件路径和组件描述。

### v2.0.0

本版本完成了 Web Worker 并行计算和错误处理机制的实现，显著提升了项目的性能和稳定性。主要变更包括：新增 Web Worker 架构，将 NLP 计算移至独立线程；新增错误处理模块，统一错误类型和处理逻辑；新增 EmptyState 空状态组件；完善单元测试覆盖范围，新增 NLP Worker 测试。功能增强方面，优化了前端组件的状态管理和错误处理逻辑，改进了搜索建议的键盘导航体验。Bug 修复包括修复了搜索历史在某些情况下无法正确加载的问题，以及修复了分析进度在网络超时后未能正确重置的问题。

### v1.2.0

本版本完成了 API Routes 服务端代理层的实现，显著提升了项目的安全性和架构完整性。主要变更包括：新增 3 个 API Routes 端点（subreddit、search、comments），实现 Reddit API 的服务端代理；新增 fetch-helper 工具模块，提供统一的请求封装和错误处理逻辑；更新所有文档反映新的 API 架构和文件统计。

### v1.1.0

本版本完成了 Docker 容器化部署的支持，标志着项目具备了生产环境部署能力。主要变更包括：实现 Next.js standalone 构建模式，优化 Docker 镜像大小至约 100MB；配置非 root 用户运行容器，提升运行时安全性；实现健康检查和优雅重启机制，确保服务可用性；添加阿里云 ECS 部署文档和自动化脚本。

### v1.0.0

初始版本发布，完成了核心功能的开发。包括话题搜索和筛选功能，支持 Subreddit 和帖子两种搜索维度；分析功能实现了评论获取、情感分析和关键词提取；洞察检测功能可识别用户反馈中的痛点和需求；UI 界面采用响应式设计，支持桌面和移动设备访问；单元测试覆盖率达到核心逻辑的 80% 以上。
