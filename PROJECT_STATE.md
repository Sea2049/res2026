# Reddit Insight Tool - 项目状态

> 新对话请先阅读本文件，快速了解项目当前状态；如需深入了解请继续阅读下方索引的文档。

## 最后更新

**2026-03-17** — 完成 P0 功能性 Bug 修复（4项）+ P1 安全/可靠性修复（6项），typecheck 零错误，新增测试 405/405 通过。

## 项目概览

Reddit Insight Tool 是一个基于 Reddit API 的社区话题筛选与分析工具，提供话题搜索、NLP 情感分析、关键词提取、AI 深度洞见（智谱 GLM-4）、优先级计算、产品吸引力评估等功能。支持 Web 和 Electron 桌面应用两种运行模式。

- **当前版本**：v2.9.1（package.json）
- **技术栈**：Next.js 14+ (App Router) / TypeScript (strict) / Tailwind CSS / Shadcn/UI / Electron / Jest
- **核心模块**：话题选择、分析（情感/关键词/洞察/趋势）、AI 深度洞见、产品吸引力评估、数据导出、Jobs 异步爬取

## 最近变更摘要

1. **2026-03-17**：P0/P1 全面修复（worker 结果字段、测试数据、SSRF 逻辑、tsconfig 排除构建产物、IP 防伪造、Worker 队列、AI 超时、Jobs 限流、targetComments 硬编码、Zhipu AI 降级）
2. **2026-03-17**：Browser-Worker 反检测全面升级（stealth-plugin / 指纹 / 持久化 / CAPTCHA / 代理）
3. **2026-03-17**：工程债务修复（middleware 清理、TS strict、Jest 阈值、文档同步）
4. **2026-02-24**：新增对话结束时文档同步规则和 PROJECT_STATE.md
5. **2026-01-30 (v2.8.8)**：移除 Git 中的构建产物追踪，源代码更新

## 当前焦点 / 待办

- 覆盖率提升至中期目标 50%（当前底线 25%）
- `src/lib/types.ts` 注释编码问题（GBK/UTF-8 乱码）待修复
- `services/browser-worker` 独立服务的存量 TypeScript 错误（analysis/orchestrator/storage 层）待治理（不影响主项目及新增反检测模块编译）
- CAPTCHA 功能需配置 `CAPTCHA_API_KEY` 环境变量才会启用
- UI 组件测试（Button/Card/Input）的 CSS class 名与实现不符（预存在），需更新测试或组件

## 文档索引

| 文档 | 说明 |
|------|------|
| [FRAMEWORK.md](FRAMEWORK.md) | 架构设计、技术栈、模块关系、API Routes、Worker 等详细说明 |
| [CODE_DIRECTORY.md](CODE_DIRECTORY.md) | 完整文件结构，按目录和功能分类，标注每个文件的作用 |
| [README.md](README.md) | 功能介绍、快速开始、环境配置、API 参考、开发规范 |
| [CHANGELOG.md](CHANGELOG.md) | 所有版本的变更记录，按版本号倒序排列 |
| [TESTING.md](TESTING.md) | 测试策略、覆盖率要求和最佳实践 |
