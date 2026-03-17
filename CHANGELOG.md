# Reddit Insight Tool 变更日志

本文档记录项目的所有重要变更，按版本号倒序排列。

## [未发布]

### 移除
- 删除 `src/middleware.ts` 邀请码验证中间件（v2.80.0 清理遗留，`/invite` 页面已不存在，中间件会导致 Web 部署 404）
- 删除 `scripts/prepare-electron.js` 中 Prisma 目录复制逻辑（Prisma 已在 v2.80.0 清理，该段代码为无效遗留）

### 变更
- `tsconfig.json`：启用 `strict: true`，新增排除 `services/`（独立 browser-worker 服务）
- `tsconfig.json`：修复 strict 模式下 3 个文件的 13 处类型错误（`electron.d.ts`、`InsightCard.tsx`、`InsightTrendChart.tsx`、`prompts.ts`）
- `jest.config.js`：设定覆盖率底线阈值（statements/lines 25%、functions 20%、branches 15%），防止覆盖率倒退
- `TESTING.md`：更新覆盖率目标为分阶段策略（底线 → 中期 50% → 长期 70%）
- 文档同步：`CODE_DIRECTORY.md`、`FRAMEWORK.md`、`PROJECT_STATE.md`、`README.md` 补录 Jobs API（4个路由）、browser-worker-client、AppShell、SettingsDialog、Validators 子模块（3个）、Job Store、Theme Store 等约 15 个缺失文件/模块记录

## [2.71.0] - 2026-01-30

### 修复

**邀请码管理修复**
- 修复创建邀请码时备注字段为空导致 400 错误的问题
- 优化备注字段验证逻辑：允许空字符串，仅在有内容时验证长度（最大 500 字符）

### 变更文件
- `src/app/api/invite/admin/route.ts` - 修复备注字段验证逻辑

## [2.66.0] - 2026-01-30

### 新增

**API 文档与 Swagger UI**
- 新增 OpenAPI 3.0 规范支持，使用 `next-swagger-doc` 自动生成 API 文档
- 新增 `/api-docs` 页面，集成 Swagger UI 提供可视化 API 文档
- 新增 `/api/docs` 端点，返回 OpenAPI JSON 规范
- 为全部 11 个 API 路由添加 JSDoc 注释，包含参数、响应、错误码说明
- 新增 `src/lib/swagger.ts` Swagger 配置文件

**请求限流系统**
- 新增 `src/lib/rate-limiter.ts` 滑动窗口限流器
- 预配置 6 种限流策略（按 IP 地址）：
  - Reddit API：30次/分钟
  - AI 分析：10次/分钟
  - 导出功能：20次/分钟
  - 邀请码验证：5次/分钟（防暴力破解）
  - 管理接口：30次/分钟
  - 分析功能：20次/分钟
- 所有 11 个 API 路由集成限流检查

**LRU 缓存优化**
- 新增 `src/lib/lru-cache.ts` 通用 LRU 缓存实现
- 支持固定大小、TTL 过期、命中率统计
- Reddit 搜索 API 使用 LRU 缓存替代简单 Map（500 条目，60秒 TTL）
- NLP 词干缓存使用 SimpleLRUCache 替代内联实现

**类型安全增强**
- 新增 Reddit API 原始响应类型定义（`RedditListingResponse`、`RedditChild`、`RedditPostData` 等）
- 替换所有 `any` 类型为具体类型定义
- `fetch-helper.ts` 错误处理类型优化
- `prompts.ts` 参数类型明确化
- `worker-manager.ts` 任务类型优化

**单元测试增强**
- 新增 `src/lib/__tests__/rate-limiter.test.ts` 限流器测试
- 新增 `src/lib/__tests__/lru-cache.test.ts` 缓存测试
- 新增 `src/lib/__tests__/auth-token.test.ts` Token 签名测试
- 新增 `src/lib/__tests__/validators.test.ts` 验证器测试
- 新增 `src/app/api/__tests__/reddit-routes.test.ts` Reddit API 路由测试
- 新增 `src/app/api/__tests__/invite-routes.test.ts` 邀请码 API 测试
- 新增 `src/app/api/__tests__/export-routes.test.ts` 导出 API 测试
- 测试套件从 15 个增加到 22 个

**Web Worker 增强**
- 支持多任务类型：`analyze`（完整分析）、`sentiment_only`（仅情感）、`keywords_only`（仅关键词）、`batch_analyze`（批量分析）
- 新增分片并行处理：大数据量（500+ 评论）自动分片处理
- 新增 `analyzeSentimentOnly()`、`extractKeywordsOnly()` 快速分析方法
- 新增 `executeWithChunking()` 分片执行方法，自动合并结果

**文件统计**
- 新增 `src/lib/swagger.ts`（Swagger 配置）
- 新增 `src/app/api-docs/page.tsx`（Swagger UI 页面）
- 新增 `src/app/api/docs/route.ts`（OpenAPI 端点）
- 新增 `src/lib/rate-limiter.ts`（限流器）
- 新增 `src/lib/lru-cache.ts`（LRU 缓存）
- 新增 7 个测试文件
- TypeScript 工具文件：35个 → 40个
- 测试文件：15个 → 22个
- 总文件数：91个 → 101个

### 修改

- 所有 11 个 API 路由添加限流检查和 JSDoc 注释
- `src/lib/nlp.ts` 使用 SimpleLRUCache 替代内联缓存
- `src/app/api/reddit/search/route.ts` 使用 LRUCache 替代 Map
- `src/lib/workers/nlp.worker.ts` 支持多任务类型
- `src/lib/workers/worker-manager.ts` 新增分片处理逻辑
- `src/lib/types.ts` 新增 Reddit API 响应类型

## [2.7.0] - 2026-01-30

### 新增

**API 安全性增强**
- 新增统一输入验证工具库（src/lib/validators.ts），提供 Reddit 参数、邀请码、文件名等验证函数
- 新增 Token 签名工具库（src/lib/auth-token.ts），使用 HMAC-SHA256 生成安全的验证 Token
- 邀请码验证 Cookie 从简单布尔值升级为签名 Token，防止伪造
- 中间件增强：验证签名 Token 而非简单布尔值，支持 Token 过期检查

**输入验证**
- Reddit API 路由（search、comments、subreddit）添加 subreddit 名称和 postId 格式验证
- 邀请码 API 路由添加 ID 格式（CUID）、maxUses 范围、expiresInDays 范围验证
- 导出 API 添加文件名安全检查（防止路径遍历）和导出格式白名单验证

**环境变量化配置**
- CORS 代理 URL 配置移至环境变量（NEXT_PUBLIC_CORS_PROXY_URL、CORS_PROXY_ALLORIGINS 等）
- 新增 INVITE_TOKEN_SECRET 环境变量，用于 Token 签名密钥配置
- 更新 .env.local.example 和 .env.production 添加新配置项文档

**新增验证函数**
- validateSubreddit：Subreddit 名称格式验证（字母、数字、下划线，最长50字符）
- validatePostId：Reddit Post ID 格式验证（字母数字，最长10字符）
- validateLimit：数值范围验证，支持默认值
- validateFilename：文件名安全检查，防止路径遍历攻击
- validateExportFormat：导出格式白名单验证
- validateCUID：Prisma CUID 格式验证
- generateVerificationToken：生成 HMAC-SHA256 签名 Token
- verifyToken：验证签名 Token，支持过期检查和时序攻击防护

**文件统计**
- 新增 src/lib/validators.ts（验证工具库）
- 新增 src/lib/auth-token.ts（Token 签名工具库）
- TypeScript 工具文件：33个 → 35个
- 总文件数：89个 → 91个

### 修改

- src/app/api/reddit/search/route.ts - 集成 validators 验证函数
- src/app/api/reddit/comments/route.ts - 添加 subreddit 和 postId 格式验证
- src/app/api/reddit/subreddit/route.ts - 添加 subreddit 和 limit 验证
- src/app/api/invite/verify/route.ts - 使用签名 Token 替代布尔值 Cookie
- src/app/api/invite/admin/route.ts - 添加 ID 和参数验证
- src/app/api/export/route.ts - 添加文件名和格式验证
- src/middleware.ts - 升级为验证签名 Token
- src/lib/api/reddit.ts - 代理 URL 从环境变量读取
- src/lib/api/fetch-helper.ts - CORS 代理 URL 从环境变量读取
- .env.local.example - 添加新环境变量文档
- .env.production - 添加生产环境配置项

### 安全改进

- 防止 Cookie 伪造：使用 HMAC-SHA256 签名 Token
- 防止路径遍历：文件名验证拒绝 ../、/、\ 等字符
- 防止参数注入：所有 API 参数经过格式验证
- 时序攻击防护：Token 验证使用 timingSafeEqual（服务端）
- 配置安全：敏感配置（代理 URL、Token 密钥）移至环境变量

## [2.6.1] - 2026-01-29

### 新增

**邀请码管理系统**
- 新增用户邀请码验证页面（/invite），用户需要输入有效邀请码才能访问应用
- 新增管理员邀请码管理后台（/admin/invite），支持完整的 CRUD 操作
- 新增 Next.js 中间件（middleware.ts），对首页访问进行邀请码验证拦截
- 新增 Prisma ORM 集成，使用 SQLite 数据库存储邀请码数据
- 新增数据库模型 InviteCode，包含邀请码的所有属性（code、maxUses、usedCount、expiresAt、enabled、note）
- 新增数据库迁移文件，支持版本化数据库管理
- 新增 Prisma 客户端单例封装（src/lib/prisma.ts），支持开发环境热重载

**API Routes**
- 新增 /api/invite/verify 端点，处理邀请码验证逻辑和 Cookie 设置
- 新增 /api/invite/admin 端点，提供邀请码的 CRUD 操作（GET、POST、PATCH、DELETE）
- 管理员 API 需要通过 ADMIN_PASSWORD 环境变量验证
- 支持邀请码的生成、查询、更新和删除操作

**功能特性**
- 邀请码支持配置最大使用次数、过期时间和备注信息
- 验证成功后设置 HttpOnly Cookie，支持自定义过期时间（默认7天）
- 管理员后台支持创建、查看、启用/禁用、删除邀请码
- 邀请码状态显示（可用、已用完、已过期、已禁用）
- 支持一键复制邀请码功能

**环境变量**
- ADMIN_PASSWORD：管理员密码，用于访问邀请码管理 API
- INVITE_COOKIE_MAX_AGE：邀请码验证 Cookie 的过期时间（秒），默认 604800（7天）
- DATABASE_URL：SQLite 数据库连接字符串

**文件统计**
- TypeScript组件：38个 → 40个（+2个页面组件）
- TypeScript工具：31个 → 33个（+2个）
- API Routes：9个 → 11个（+2个）
- 总文件数：84个 → 89个

### 新增文件

- src/middleware.ts - Next.js 中间件，拦截首页访问
- src/lib/prisma.ts - Prisma 客户端封装
- src/app/invite/page.tsx - 邀请码验证页面
- src/app/admin/invite/page.tsx - 管理员邀请码管理页面
- src/app/api/invite/verify/route.ts - 邀请码验证 API
- src/app/api/invite/admin/route.ts - 邀请码管理 API
- prisma/schema.prisma - 数据库模型定义
- prisma/migrations/20260129105135_init/ - 数据库迁移文件

## [2.6.0] - 2026-01-28

### 新增

**WISH信号检测**
- 新增WISH信号识别模式，可检测7类愿望表达（直接愿望、should语句、缺失表达、希望语句、期待表达、需求陈述、愿望名词）
- WISH信号自动归类为feature_request类型，并标注isWish标记
- 新增紧急度评分（0-10），基于关键词强度和提及频率

**洞察分类增强**
- 新增子分类系统（Bug/性能/UX问题/定价/文档/集成/愿望）
- 每个洞察自动检测最匹配的子分类
- UI组件显示子分类标签和图标

**优先级计算系统**
- 新增优先级计算公式：Priority = (Impact × Frequency × Urgency) / Effort
- 优先级等级：Critical/High/Medium/Low四级
- 新增API端点 `/api/analysis/prioritize` 支持批量计算
- 为每个优先级等级提供建议行动方案

**产品吸引力评估模块**
- 新增product-appeal功能模块，基于可欲性三角模型（Identity Fit + Problem Urgency + Trust Signals）
- 检测7类反对意见（信任/怀疑/价值/复杂度/身份不符/风险/拖延）
- 提取用户身份信号和目标用户画像
- 生成吸引力评分报告和改进建议
- 新增API端点 `/api/analysis/appeal`

**数据导出功能**
- 新增统一导出接口 `/api/export`
- 支持Excel格式导出（/api/export/excel）
- 支持PDF格式导出（/api/export/pdf）
- 导出内容包含完整分析数据和洞察报告

**UI组件更新**
- InsightCard组件新增WISH标记、子分类标签、身份信号、反对意见等显示
- InsightFilters组件新增子分类筛选和WISH信号筛选
- 新增AppealScore、ObjectionMap等可视化组件

**技术架构**
- 新增sentiment-patterns.ts模式定义文件
- 新增priority-calculator.ts优先级计算工具
- 新增qwen-ai.ts千问AI客户端
- 扩展Insight类型支持新字段（subType、priority、urgency等）
- 新增单元测试覆盖新功能

**文件统计**
- TypeScript组件：35个 → 38个
- TypeScript工具：25个 → 31个
- 测试文件：13个 → 15个
- 总文件数：79个 → 84个

## [2.5.0] - 2026-01-27

### 新增

**洞察筛选功能**
- 新增 InsightFilters 组件，提供多维度筛选（类型、趋势、严重程度、置信度）
- 支持关键词搜索和筛选组合
- 提供筛选器折叠/展开和清除功能

**洞察可视化增强**
- 新增 InsightGraph 组件，使用力导向布局展示洞察关系网络
- 支持相似、对立、相关三种关系类型的可视化
- 节点按洞察类型着色，支持缩放、平移和节点点击交互
- 新增 InsightTrendChart 组件，展示洞察趋势概览和预测

**趋势分析功能**
- 新增 useInsightTrend 钩子，管理洞察筛选、排序和趋势分析
- 提供趋势预测计算和统计信息生成
- 支持按置信度、评论数、时间和影响分数排序

**测试体系增强**
- 新增 3 个 UI 组件单元测试（Button/Card/Input）
- 新增用户流程集成测试，覆盖搜索→选择→分析→导出完整流程
- 测试套件从 9 个增加到 13 个

**文档更新**
- 更新 CODE_DIRECTORY.md，新增文件清单和统计
- 更新 FRAMEWORK.md，补充洞察增强功能说明
- 文件总数从 58 个增加到 68 个

## [2.4.0] - 2026-01-19

### 新增

**AI集成**
- 新增智谱AI客户端（zhipu-ai.ts），封装GLM-4 API调用逻辑
- 实现JWT token生成和请求签名机制
- 新增Prompt模板系统（prompts.ts），将分析结果转换为AI友好的格式

**深度洞见功能**
- 创建 useDeepInsights 钩子，管理深度洞见生成状态
- 开发 DeepInsights 组件，展示AI生成的深度分析报告
- 支持Markdown格式渲染和折叠展开交互
- 实现进度提示、取消机制和错误处理
- 新增深度洞见API路由（/api/ai/insights），处理服务端逻辑

**分析模块增强**
- 在分析仪表板中新增"AI深度洞见"标签页
- 修改TabsList从4列扩展到5列，支持5个维度的分析展示
- 支持深度洞见数据导出为Markdown格式
- 独立的状态管理，不影响其他分析功能的正常运行

**文档更新**
- 更新FRAMEWORK.md添加AI集成模块说明
- 更新API Routes架构描述，新增insights端点
- 更新分析模块功能说明，包含深度洞见组件
- 添加环境变量配置示例文件（.env.local.example）

**技术实现**
- 实现结构化的Prompt设计，包含核心发现、用户痛点、需求趋势等维度
- 使用AbortController支持请求取消
- 完善的错误处理和降级方案
- 符合项目命名规范和安全检查清单

## [2.3.0] - 2026-01-18

### 新增

**性能优化**
- **LRU缓存机制**：为词干提取(stemmer)添加LRU缓存，缓存容量2000条，避免重复计算相同单词的词干，性能提升20-30%
- **批量TF-IDF计算**：优化TFIDFCalculator类，新增addDocuments批量处理方法，将文档频率统计从O(n×m)优化到O(n+m)，性能提升40-50%
- **Top-K堆算法**：使用最小堆替代全排序，将关键词排序从O(n log n)优化到O(n log k)，k为topKeywordsCount，性能提升15-25%
- **情感判断优化**：使用布尔变量缓存Set查询结果，避免对同一词的重复查询，减少50%的Set.has()调用
- **递归深度限制**：限制词干提取递归深度为1，避免过深递归导致的性能问题
- **整体性能提升**：关键词提取模块整体性能提升约60-80%，1000条评论的处理时间从约8-10秒降至3-4秒

**算法增强**
- 新增MinHeap最小堆数据结构，用于高效Top-K元素筛选
- 优化词干提取算法，添加缓存层和递归深度控制
- 优化情感分析算法，减少重复Set查询

**代码质量**
- 所有优化通过TypeScript类型检查
- 保持向后兼容性，不影响现有功能
- 优化代码注释，说明性能优化点

## [2.2.0] - 2026-01-18

### 新增

**性能优化**
- 新增防抖搜索功能，输入关键词时自动触发搜索（500ms 防抖），避免频繁请求造成的性能问题
- 使用 React.memo 和 useMemo 优化 TopicCard 和 TopicList 组件渲染性能
- 使用 useCallback 优化回调函数，减少不必要的重渲染

**用户体验增强**
- 增强搜索建议的智能性，根据关键词类型（技术、兴趣爱好等）生成更精准的搜索建议
- 搜索结果按 Subreddit 和帖子分类分组展示，便于用户快速筛选
- 新增批量选择功能，支持全选当前搜索结果和批量取消选择
- 增强键盘导航支持，历史记录下拉框支持上下键导航和回车确认
- 新增当前搜索结果显示区域，展示结果统计和快捷操作按钮

**功能扩展**
- useTopicSearch 钩子新增 selectTopics、deselectTopics、selectAll、deselectAll 四个方法
- TopicList 组件新增 showGrouping 属性，支持启用/禁用分类分组显示

## [2.1.0] - 2026-01-16

### 新增

**文档更新**
- 更新文件统计信息（29 个 TypeScript 组件，17 个 TypeScript 工具文件）
- 更新 API Routes 相关描述以反映最新的服务端代理架构
- 更新 Web Worker 架构说明以匹配当前的 Worker 线程实现
- 更新错误处理模块说明以匹配 errors.ts 的功能
- 更新单元测试覆盖范围说明

**文档更新覆盖**
- FRAMEWORK.md
- CODE_DIRECTORY.md
- README.md

**Bug修复**
- 修正了文档中不一致的文件路径和组件描述

## [2.0.0] - 2026-01-15

### 新增

**Web Worker 并行计算**
- 新增 Web Worker 架构，将 NLP 计算移至独立线程
- 实现 worker-manager.ts 和 nlp.worker.ts
- 避免 CPU 密集型操作阻塞主线程

**错误处理机制**
- 新增错误处理模块（errors.ts）
- 统一错误类型和处理逻辑
- 提供创建错误、格式化错误消息和判断错误类型的工具函数

**空状态组件**
- 新增 EmptyState 组件，在无数据时显示友好的空状态提示

**测试完善**
- 新增 NLP Worker 测试
- 完善单元测试覆盖范围

**功能增强**
- 优化前端组件的状态管理和错误处理逻辑
- 改进搜索建议的键盘导航体验

**Bug修复**
- 修复了搜索历史在某些情况下无法正确加载的问题
- 修复了分析进度在网络超时后未能正确重置的问题

**文件统计**
- TypeScript 工具文件：14个 → 17个
- 组件文件：28个 → 29个

## [1.2.0] - 2026-01-12

### 新增

**API Routes 服务端代理**
- 新增 3 个 API Routes 端点（subreddit、search、comments）
- 实现 Reddit API 的服务端代理
- 新增 fetch-helper 工具模块，提供统一的请求封装和错误处理逻辑

**安全增强**
- API 密钥和敏感配置存储在服务端环境变量中
- 避免在前端代码中暴露 API 凭证

**文档更新**
- 更新所有文档反映新的 API 架构和文件统计

**文件统计**
- TypeScript 工具文件：10个 → 14个

## [1.1.0] - 2026-01-10

### 新增

**Docker 容器化部署**
- 实现 Next.js standalone 构建模式，优化 Docker 镜像大小至约 100MB
- 配置非 root 用户运行容器，提升运行时安全性
- 实现健康检查和优雅重启机制，确保服务可用性
- 添加阿里云 ECS 部署文档和自动化脚本

**部署文档**
- 新增 DEPLOYMENT.md，包含完整的部署指南
- 提供自动化部署脚本

## [1.0.0] - 2026-01-05

### 初始版本发布

**核心功能**
- 话题搜索和筛选功能，支持 Subreddit 和帖子两种搜索维度
- 分析功能实现了评论获取、情感分析和关键词提取
- 洞察检测功能可识别用户反馈中的痛点和需求
- UI 界面采用响应式设计，支持桌面和移动设备访问
- 单元测试覆盖率达到核心逻辑的 80% 以上

**文件统计**
- 组件文件：22个
- 工具文件：8个
- 配置文件：若干

**技术栈**
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Jest & React Testing Library
