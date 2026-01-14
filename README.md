# Reddit Insight Tool

<div align="center">

**发现热门主题，洞察用户痛点**

基于 Reddit 社区的主题筛选与分析工具

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

[v1.0](https://github.com/Sea2049/res2026/releases/tag/v1.0) · [GitHub](https://github.com/Sea2049/res2026)

</div>

---

## ✨ 功能特性

### 🔍 主题筛选 (Topic Selection)
- **智能搜索**: 输入关键词快速搜索 Subreddits 和 Posts
- **搜索建议**: 展示搜索历史，提供快捷搜索体验
- **高级筛选**: 支持按类型（Subreddit/Post）、排序方式筛选
- **主题选择**: 自由选择感兴趣的主题进行深入分析

### 📊 分析追踪 (Analysis)
- **关键词云**: 可视化展示高频关键词，大小和颜色反映词频和情感
- **情感分析**: 正面/中性/负面评论比例分布图表
- **洞察卡片**: 自动识别用户痛点、功能需求、问题反馈和赞美
- **评论列表**: 带情感标签的评论展示，支持筛选和高亮

### 🛠 技术特性
- **NLP 自然语言处理**: 停用词过滤、情感分析、洞察检测
- **Reddit API 集成**: 完整的 API 封装，支持批量数据获取
- **单元测试**: 核心组件和 Hooks 覆盖测试
- **类型安全**: 严格的 TypeScript 类型定义

---

## 🏗 技术栈

| 技术 | 用途 |
|------|------|
| **Next.js 14+** | React 框架 (App Router) |
| **TypeScript** | 类型安全的代码编写 |
| **Tailwind CSS** | 原子化 CSS 样式 |
| **Shadcn/UI** | 高质量 UI 组件库 |
| **React Hooks** | 状态管理和逻辑复用 |
| **Reddit API** | 社区数据获取 |
| **Jest** | 单元测试框架 |

---

## 🚀 快速开始

### 环境要求

- Node.js 18.17 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/Sea2049/res2026.git
cd res2026

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |
| `npm run test` | 运行单元测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 生成测试覆盖率报告 |

---

## 📁 项目结构

```
res2026/
├── src/
│   ├── app/                    # 页面路由和布局
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   └── globals.css         # 全局样式
│   ├── components/             # 通用 UI 组件
│   │   └── ui/                 # Shadcn/UI 组件库
│   ├── features/               # 业务功能模块
│   │   ├── topic-selection/    # 主题筛选功能
│   │   └── analysis/           # 分析功能
│   └── lib/                    # 工具库
│       ├── api/                # Reddit API 客户端
│       ├── nlp.ts              # NLP 自然语言处理
│       ├── types.ts            # 类型定义
│       └── utils.ts            # 工具函数
├── FRAMEWORK.md                # 框架设计文档
├── CODE_DIRECTORY.md           # 代码目录索引
└── package.json                # 项目依赖
```

---

## 📖 API 参考

### Reddit API 客户端 (`src/lib/api/reddit.ts`)

| 方法 | 描述 |
|------|------|
| `searchSubreddits(query)` | 搜索 Subreddits |
| `searchPosts(query)` | 搜索 Posts |
| `getComments(postId)` | 获取帖子评论 |
| `getSubredditPosts(subreddit)` | 获取 Subreddit 热门帖子 |
| `getMultiplePostComments(posts)` | 批量获取帖子评论 |
| `getSubredditComments(subreddit)` | 获取 Subreddit 热门评论 |

### NLP 模块 (`src/lib/nlp.ts`)

- **文本清洗**: `cleanText()`, `escapeHtml()`
- **分词处理**: `tokenize()`, `removeStopWords()`
- **关键词提取**: `extractKeywords()`
- **情感分析**: `analyzeSentiment()`
- **洞察检测**: `extractInsights()`

---

## 🧪 测试

项目使用 Jest 和 React Testing Library 进行单元测试。

```bash
# 运行所有测试
npm run test

# 生成覆盖率报告
npm run test:coverage
```

### 测试覆盖范围

- `TopicCard.test.tsx`: 主题卡片组件测试
- `TopicSearchInput.test.tsx`: 搜索输入框组件测试
- `useTopicSearch.test.ts`: 搜索状态 Hook 测试
- `useSearchHistory.test.ts`: 搜索历史 Hook 测试

---

## 📝 文档

- [FRAMEWORK.md](FRAMEWORK.md) - 框架设计文档
- [CODE_DIRECTORY.md](CODE_DIRECTORY.md) - 代码目录索引

---

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目采用 ISC 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Shadcn/UI](https://ui.shadcn.com/) - UI 组件库
- [Reddit API](https://www.reddit.com/dev/api/) - 社区数据来源

---

<div align="center">

**Made with ❤️ by Sea2049**

[GitHub](https://github.com/Sea2049) · [Issues](https://github.com/Sea2049/res2026/issues)

</div>
