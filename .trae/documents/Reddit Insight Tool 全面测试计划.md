# Reddit Insight Tool 全面测试计划

## 一、测试范围概述

基于项目代码分析，本次测试将覆盖以下方面：

### 1. 单元测试（Unit Tests）
- **现有测试补充**：扩展现有的 5 个单元测试文件
- **新增测试**：为未覆盖的核心模块添加测试
- **目标覆盖率**：达到 80% 以上（当前配置要求 70%）

### 2. 集成测试（Integration Tests）
- **API Routes 测试**：测试 3 个 API 端点
- **组件集成测试**：测试功能模块的组件交互
- **Worker 线程测试**：测试 NLP Worker 的并行处理

### 3. 端到端测试（E2E Tests）
- **用户流程测试**：完整的搜索-分析流程
- **错误处理测试**：网络异常、API 失败等场景

### 4. 性能测试
- **NLP 处理性能**：测试大量评论的处理速度
- **API 响应时间**：测试 API Routes 的响应性能

### 5. 安全测试
- **输入验证**：SQL 注入、XSS 风险检查
- **API 安全**：密钥保护、请求限流测试

## 二、具体测试任务

### 阶段 1：补充单元测试（优先级：高）
1. **创建 jest.setup.js**（当前缺失）
2. **补充 Analysis 模块测试**
   - useAnalysis.test.ts
   - AnalysisProgress.test.tsx
   - InsightCard.test.tsx
3. **补充 API 工具测试**
   - fetch-helper.test.ts
   - reddit.test.ts
4. **补充 Worker 测试**
   - worker-manager.test.ts
5. **补充 UI 组件测试**（选择核心组件）
   - Button.test.tsx
   - Input.test.tsx
   - Card.test.tsx

### 阶段 2：集成测试（优先级：高）
1. **API Routes 集成测试**
   - search.route.test.ts
   - comments.route.test.ts
   - subreddit.route.test.ts
2. **功能模块集成测试**
   - topic-selection 模块完整流程
   - analysis 模块完整流程

### 阶段 3：E2E 测试（优先级：中）
1. **安装 Playwright**（推荐）或 Cypress
2. **创建 E2E 测试用例**
   - 搜索 Subreddit 流程
   - 搜索帖子流程
   - 分析评论流程
   - 导出结果流程

### 阶段 4：性能与安全测试（优先级：中）
1. **性能基准测试**
   - NLP 处理 1000 条评论的时间
   - API 响应时间测试
2. **安全测试**
   - 输入验证测试
   - XSS 防护测试
   - API 限流测试

### 阶段 5：测试报告与文档（优先级：低）
1. **生成测试覆盖率报告**
2. **创建测试文档**（TESTING.md）
3. **更新 CODE_DIRECTORY.md**

## 三、执行步骤

1. **创建缺失的测试配置文件**
2. **按优先级顺序编写测试用例**
3. **运行测试并修复发现的问题**
4. **生成覆盖率报告**
5. **更新项目文档**

## 四、预期成果

- ✅ 单元测试覆盖率达到 80%+
- ✅ 所有核心功能有集成测试
- ✅ 关键用户流程有 E2E 测试
- ✅ 性能基准数据记录
- ✅ 安全漏洞检查通过
- ✅ 完整的测试文档

## 五、注意事项

- 所有测试代码添加中文注释
- 遵循项目现有的测试风格
- 测试用例要覆盖边界情况
- Mock 外部依赖（Reddit API）
- 确保测试可重复运行