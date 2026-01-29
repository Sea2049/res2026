# /release - 版本发布流程

## 描述
更新版本号、文档并推送到 GitHub

## 参数
- `version`: 新版本号（如 2.6.4）
- `description`: 版本描述（可选）

## 执行步骤

### 1. 确认版本号
- 读取当前 `package.json` 中的版本号
- 询问用户新版本号（如果未提供）
- 版本号格式建议：major.minor.patch（如 2.6.4）

### 2. 更新 package.json
将 `version` 字段更新为新版本号

### 3. 更新 README.md 版本历史
在 `## 版本历史` 部分添加新版本记录，格式如下：

```markdown
### vX.X.X（YYYY-MM-DD）

本版本主要更新内容描述...

**核心功能**：
- 功能点1
- 功能点2

**技术亮点**：
- 技术改进1
- 技术改进2
```

### 4. 提交更改
```bash
git add package.json README.md
git commit -m "release: vX.X.X - 版本描述"
```

### 5. 推送到 GitHub
```bash
git push origin main
```

### 6. 输出结果
- 显示版本更新成功信息
- 提示用户是否需要部署到服务器（可使用 /deploy 命令）

## 示例
用户输入：`/release 2.6.4 修复登录问题`
结果：更新版本号为 2.6.4，添加版本历史记录，提交并推送
