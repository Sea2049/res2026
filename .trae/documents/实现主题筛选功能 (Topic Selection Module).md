## 实施计划：主题筛选功能模块

### 1. 项目依赖配置
- 更新 package.json，添加 Next.js 14+、React、TypeScript、Tailwind CSS 依赖

### 2. 工具函数增强
- 在 [utils.ts](file:///e:/trae/reddit%20res2026/res2026/src/lib/utils.ts) 添加 XSS 防护函数（HTML 转义）
- 添加格式化工具（如格式化订阅数、时间戳）

### 3. 创建核心组件
在 `src/features/topic-selection/components/` 目录下创建：
- **TopicSearchInput.tsx** - 搜索输入框组件
  - 支持输入验证和防抖
  - 提供搜索按钮
  - 处理回车键搜索
- **TopicCard.tsx** - 单个主题卡片组件
  - 显示 Subreddit 或 Post 信息
  - 支持选择/取消选择
  - 安全渲染用户内容（XSS 防护）
- **TopicList.tsx** - 搜索结果列表组件
  - 渲染 TopicCard 列表
  - 支持空状态和加载状态
  - 显示搜索结果统计

### 4. 创建自定义 Hook
- **useTopicSearch.ts** - 搜索状态管理 Hook
  - 管理搜索关键词、搜索结果、加载状态、错误信息
  - 集成 Reddit API 调用
  - 实现防抖搜索
  - 处理边界情况（网络失败、空结果）

### 5. 完善 TopicSelection 主组件
- 重写 [topic-selection/index.ts](file:///e:/trae/reddit%20res2026/res2026/src/features/topic-selection/index.ts)
- 整合所有子组件
- 管理已选主题状态
- 提供主题筛选和搜索的完整流程

### 6. 更新项目文档
- 同步更新 [CODE_DIRECTORY.md](file:///e:/trae/reddit%20res2026/res2026/CODE_DIRECTORY.md)
- 记录新增文件和功能模块

### 安全与规范检查
- ✅ 所有关键代码添加中文注释
- ✅ XSS 防护：转义所有用户输入和 API 返回内容
- ✅ 边界处理：处理 API 失败、空数据、网络超时
- ✅ 命名规范：camelCase 变量，PascalCase 组件
- ✅ TypeScript 类型安全