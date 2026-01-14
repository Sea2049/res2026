# 实现 src/components 通用 UI 组件模块

## 步骤

1. **安装依赖**

   * 安装 `lucide-react` 图标库

2. **创建目录结构**

   * 创建 `src/components/ui/` 目录

   * 创建 `src/components/index.ts` 导出文件

3. **实现基础 UI 组件**

   * `button.tsx` - 多样式按钮组件（primary/secondary/ghost/outline）

   * `card.tsx` - 卡片容器组件

   * `input.tsx` - 输入框组件

   * `badge.tsx` - 标签/徽章组件

   * `spinner.tsx` - 加载动画组件

   * `alert.tsx` - 警告/提示信息组件

   * `tabs.tsx` - 标签页组件

   * `separator.tsx` - 分隔线组件

4. **更新文档**

   * 更新 `CODE_DIRECTORY.md`，添加 `src/components` 目录说明

## 规范遵循

* 所有关键代码添加中文注释

* 使用 TypeScript 严格类型

* 遵循命名规范（camelCase/PascalCase）

* 处理边界情况和安全（XSS 防护）

* 添加 aria 属性提升可访问性

