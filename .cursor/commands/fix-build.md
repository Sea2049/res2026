# /fix-build - 修复常见的 Docker 构建问题

## 描述
诊断并修复常见的 Docker/Alpine 构建问题

## 常见问题及解决方案

### 问题 1: Prisma Query Engine 缺失
**错误信息**: `Prisma Client could not locate the Query Engine for runtime "linux-musl-openssl-3.0.x"`

**解决方案**:
1. 检查 `prisma/schema.prisma` 中的 binaryTargets 配置
2. 确保包含以下配置：
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

### 问题 2: Prisma 版本不兼容
**错误信息**: `The datasource property 'url' is no longer supported in schema files`

**解决方案**:
1. 检查 `package.json` 中的 Prisma 版本
2. 锁定版本为 5.22.0（避免 v7 破坏性变更）：
```json
"@prisma/client": "5.22.0",
"prisma": "5.22.0",
```

### 问题 3: undici 模块导入错误
**错误信息**: `File '/app/src/lib/api/fetch-helper.ts' is not a module`

**解决方案**:
1. 确保 `undici` 在 dependencies 中，而不是 devDependencies
2. 修改 `package.json`

### 问题 4: OpenSSL 缺失
**错误信息**: `Prisma failed to detect the libssl/openssl version`

**解决方案**:
1. 在 Dockerfile 的 runner 阶段添加：
```dockerfile
RUN apk add --no-cache openssl openssl-dev
```

### 问题 5: Prisma 权限问题
**错误信息**: `Can't write to /app/node_modules/@prisma/engines`

**解决方案**:
1. 在 Dockerfile 中设置正确权限：
```dockerfile
RUN chown -R nextjs:nodejs /app/node_modules/.prisma /app/node_modules/@prisma /app/node_modules/prisma
```

### 问题 6: npx 下载最新版本
**错误信息**: `npm warn exec The following package was not found and will be installed: prisma@7.x.x`

**解决方案**:
1. 修改启动脚本使用本地安装的 Prisma：
```bash
# 替换 npx prisma
./node_modules/prisma/build/index.js migrate deploy
```
2. 确保 Dockerfile 复制了 `node_modules/prisma` 目录

## 诊断步骤

1. **查看构建日志**:
```bash
docker-compose logs --tail=100 app
```

2. **检查容器状态**:
```bash
docker-compose ps
```

3. **测试本地连接**:
```bash
curl http://localhost:3000
```

## 快速修复命令

如果需要完全重建：
```bash
cd /opt/res2026
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f app
```
