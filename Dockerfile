# =============================================
# Reddit Insight Tool - Docker 生产环境配置
# =============================================

# 使用 Node.js 官方 LTS 镜像
FROM node:20-alpine AS base

# =============================================
# 安装依赖阶段
# =============================================
FROM base AS deps
# 安装 git（某些 npm 包需要）
RUN apk add --no-cache git
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# =============================================
# 构建阶段
# =============================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建生产应用
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# =============================================
# 运行阶段
# =============================================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# 启动应用
CMD ["node", "server.js"]
