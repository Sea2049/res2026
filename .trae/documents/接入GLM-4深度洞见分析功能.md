# 接入GLM-4深度洞见分析功能实现计划

## 一、环境变量配置和API路由结构

### 1.1 环境变量配置

* 在 `.env.local` 中添加智谱AI API密钥配置

* 在 `.env.production.template` 中添加生产环境模板

### 1.2 API路由结构

* 创建 `src/app/api/ai/insights/route.ts` API端点

* 接收分析结果数据，调用GLM-4 API生成深度洞见

* 实现请求验证、错误处理和响应格式化

***

## 二、智谱AI集成和Prompt逻辑

### 2.1 创建智谱AI客户端

* 创建 `src/lib/ai/zhipu-ai.ts` 模块

* 封装GLM-4 API调用逻辑

* 实现JWT token生成和请求签名

### 2.2 设计Prompt模板

* 创建 `src/lib/ai/prompts.ts` 模块

* 设计针对Reddit评论数据的分析Prompt

* 包含情感分析、关键词聚类、趋势预测等维度

### 2.3 数据预处理

* 将分析结果转换为AI友好的格式

* 优化数据结构以适应上下文长度限制

* 实现分批处理策略（数据量大时）

***

## 三、前端Hook和组件开发

### 3.1 创建自定义Hook

* 创建 `src/features/analysis/hooks/useDeepInsights.ts`

* 管理深度洞见生成状态（idle/loading/success/error）

* 处理API调用、结果缓存和错误处理

### 3.2 创建深度洞见组件

* 创建 `src/features/analysis/components/DeepInsights.tsx`

* 展示AI生成的深度分析报告

* 包洞见概览、关键发现、趋势预测、行动建议等部分

* 支持Markdown渲染和折叠展开交互

### 3.3 类型定义扩展

* 在 `src/lib/types.ts` 中添加深度洞见相关类型

* 定义AI响应结构和解析接口

***

## 四、集成到分析仪表板

### 4.1 扩展标签页

* 在 `src/features/analysis/index.tsx` 中添加"深度洞见"标签

* 修改TabsList从4列改为5列

* 添加新的TabsContent

### 4.2 导出功能增强

* 在导出功能中添加深度洞见数据

* 支持单独导出AI分析报告

* 在Excel中新增"AI深度洞见"工作表

### 4.3 用户体验优化

* 添加生成进度提示

* 支持重新生成和版本历史

* 提供部分数据预览（限制token使用）

***

## 五、独立子模块实现

### 5.1 模块结构

```
src/features/analysis/
├── components/
│   └── DeepInsights.tsx          # 深度洞见展示组件
├── hooks/
│   └── useDeepInsights.ts         # 深度洞见生成Hook
└── types/
    └── deep-insight.types.ts      # 深度洞见类型定义
```

### 5.2 功能特性

* 与关键词、情感、洞察、评论并列展示

* 支持异步生成，不阻塞其他功能

* 结果可缓存，避免重复调用

* 支持导出和分享

***

## 六、安全性和性能考虑

### 6.1 安全措施

* API密钥仅存储在服务端环境变量

* 实现请求频率限制

* 添加用户输入验证和清理

### 6.2 性能优化

* 实现结果缓存机制

* 支持取消请求（AbortController）

* 优化数据传输大小

### 6.3 边界情况处理

* 空数据、网络失败、API限流

* 超时重试机制

* 降级方案（基础洞察作为后备）

***

## 七、测试和文档

### 7.1 单元测试

* 测试智谱AI客户端

* 测试Prompt生成逻辑

* 测试数据转换和解析

### 7.2 集成测试

* 测试完整的生成流程

* 测试错误处理和恢复

### 7.3 文档更新

* 更新 `FRAMEWORK.md` 添加深度洞见模块说明

* 更新 `CODE_DIRECTORY.md` 添加新文件索引

* 添加环境变量配置说明

***

## 实施顺序

1. **第一步**：环境配置和API路由
2. **第二步**：智谱AI集成和Prompt设计
3. **第三步**：前端Hook和组件开发
4. **第四步**：集成到仪表板
5. **第五步**：测试、优化和文档更新

***

## 技术要点

* 使用智谱AI GLM-4 API

* 实现JWT签名认证

* 设计结构化的Prompt模板

* 支持流式响应（可选）

* 结果持久化到session存储

* 支持Markdown渲染展示

