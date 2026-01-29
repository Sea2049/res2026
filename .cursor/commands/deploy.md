# /deploy - 自动化服务器部署流程

## 描述
将最新代码部署到 sea2049.com 服务器

## 执行步骤

请按顺序执行以下部署步骤：

### 1. 检查本地状态
- 运行 `git status` 检查是否有未提交的更改
- 如果有未提交的更改，询问用户是否要先提交

### 2. 推送到 GitHub
```bash
git push origin main
```

### 3. SSH 到服务器执行部署
提供以下命令让用户在服务器上执行：

```bash
# SSH 连接
ssh root@8.210.137.122

# 进入项目目录
cd /opt/res2026

# 拉取最新代码
git pull origin main

# 停止容器
docker-compose down

# 重新构建并启动
docker-compose build --no-cache
docker-compose up -d

# 查看日志确认启动成功
docker-compose logs -f app
```

### 4. 验证部署
- 提示用户访问 https://sea2049.com 验证网站是否正常运行
- 如果有问题，提供排查建议

## 注意事项
- 服务器 IP: 8.210.137.122
- 项目目录: /opt/res2026
- 如果只是代码更新不涉及依赖变化，可以省略 `--no-cache` 加速构建
