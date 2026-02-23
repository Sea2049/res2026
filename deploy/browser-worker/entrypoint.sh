#!/bin/bash
set -e

# 启动 Xvfb
Xvfb :99 -screen 0 1920x1080x24 &
XVFB_PID=$!

export DISPLAY=:99

# 等待 Xvfb 就绪
sleep 2

# 优雅关闭处理
cleanup() {
  echo "Shutting down..."
  kill -SIGTERM $APP_PID 2>/dev/null || true
  wait $APP_PID 2>/dev/null || true
  kill $XVFB_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# 启动 Browser Worker 服务
node dist/server.js &
APP_PID=$!

# 等待进程
wait $APP_PID
