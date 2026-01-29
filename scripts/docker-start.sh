#!/bin/sh
set -e

# 初始化数据库目录
mkdir -p /app/data

# 如果数据库不存在，运行迁移创建数据库
if [ ! -f /app/data/prod.db ]; then
  echo "初始化数据库..."
  npx prisma migrate deploy
  echo "数据库初始化完成"
fi

# 启动应用
exec node server.js
