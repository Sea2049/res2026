# Browser Worker 部署指南

## 环境变量清单

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3001` | 服务监听端口 |
| `USE_XVFB` | `true` | 是否启用虚拟显示（无头浏览器需要） |
| `DISPLAY` | `:99` | X11 显示标识符 |
| `DB_DRIVER` | `sqlite` | 数据库驱动：`sqlite`（开发/回退）或 `postgres`（生产推荐） |
| `DB_PATH` | `/app/data/browser-worker.db` | SQLite 数据库文件路径（仅 `DB_DRIVER=sqlite` 时有效） |
| `DATABASE_URL` | — | PostgreSQL 连接字符串（`DB_DRIVER=postgres` 时**必填**），格式：`postgresql://user:pass@host:5432/dbname` |
| `WORKER_TOKEN` | `changeme` | 服务认证 Token（**生产环境必须修改**） |
| `LOG_LEVEL` | `info` | 日志级别（`debug`/`info`/`warn`/`error`） |
| `MAX_CONCURRENT_BROWSERS` | `3` | 最大并发浏览器实例数 |

---

## Docker 部署（3 条命令）

```bash
# 1. 复制并配置环境变量
cp .env.example .env && vi .env   # 修改 WORKER_TOKEN

# 2. 构建并启动
docker-compose -f deploy/browser-worker/docker-compose.yml up -d --build

# 3. 验证健康状态
docker ps | grep reddit-browser-worker
```

---

## systemd 部署（4 条命令）

```bash
# 1. 创建用户和目录
sudo useradd -r -s /bin/false browser-worker && sudo mkdir -p /opt/browser-worker/data && sudo chown -R browser-worker:browser-worker /opt/browser-worker

# 2. 部署应用文件
sudo rsync -a services/browser-worker/ /opt/browser-worker/ && cd /opt/browser-worker && sudo -u browser-worker npm install && sudo -u browser-worker npx tsc

# 3. 安装并启动服务
sudo cp deploy/browser-worker/browser-worker.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable browser-worker && sudo systemctl start browser-worker

# 4. 验证服务状态
sudo systemctl status browser-worker
```

---

## 健康检查验证

```bash
# HTTP 健康端点
curl -f http://localhost:3001/health

# Docker 容器健康状态
docker inspect reddit-browser-worker --format='{{.State.Health.Status}}'

# systemd 服务日志
journalctl -u browser-worker -f --lines=50
```

---

## 灰度发布流程（5 个阶段）

| 阶段 | 流量比例 | 说明 | 推进条件 |
|------|----------|------|----------|
| `internal` | 0% | 仅内部 QA 调用 | 手动验证通过 |
| `canary_10` | 10% | 小流量金丝雀 | 成功率 ≥ 95%，延迟 P95 ≤ 15min，持续 1h |
| `canary_30` | 30% | 扩大验证 | 成功率 ≥ 95%，延迟 P95 ≤ 15min，持续 2h |
| `canary_60` | 60% | 半量上线 | 成功率 ≥ 95%，延迟 P95 ≤ 15min，持续 4h |
| `full` | 100% | 全量上线 | 各指标稳定 |

通过 API 推进阶段：

```bash
# 查看当前阶段
curl http://localhost:3001/rollout/stage

# 推进到下一阶段
curl -X POST http://localhost:3001/rollout/advance \
  -H "Authorization: Bearer $WORKER_TOKEN"
```

**自动回滚触发条件：**
- `job_success_rate < 0.9`
- `analysis_latency_p95_ms > 900000`（15 分钟）

---

## 回滚步骤

```bash
# 方式 1：API 强制回滚（推荐）
curl -X POST http://localhost:3001/rollout/rollback \
  -H "Authorization: Bearer $WORKER_TOKEN"

# 方式 2：Docker 回滚到上一镜像
docker-compose -f deploy/browser-worker/docker-compose.yml down
docker tag reddit-browser-worker:previous reddit-browser-worker:latest
docker-compose -f deploy/browser-worker/docker-compose.yml up -d

# 方式 3：systemd 服务回滚
sudo systemctl stop browser-worker
sudo cp /opt/browser-worker-backup/dist /opt/browser-worker/dist -r
sudo systemctl start browser-worker
```

---

## 常见故障排查

### Xvfb 无法启动

**症状：** 日志显示 `cannot open display :99` 或 `Xvfb failed to start`

```bash
# 检查 Xvfb 是否安装
which Xvfb || sudo apt-get install -y xvfb

# 检查 :99 端口是否被占用
ls /tmp/.X99-lock

# 手动清理并重试
sudo rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
sudo systemctl restart browser-worker
```

### 浏览器崩溃

**症状：** `Error: Browser closed unexpectedly` 或 Playwright 超时

```bash
# 检查系统资源
free -h && df -h

# 查看浏览器进程崩溃日志
journalctl -u browser-worker --since "10 min ago" | grep -i "crash\|killed\|OOM"

# 减少并发浏览器数
echo "MAX_CONCURRENT_BROWSERS=1" >> /opt/browser-worker/.env
sudo systemctl restart browser-worker

# 检查内核 OOM 日志
dmesg | grep -i "oom\|killed" | tail -20
```

### OOM（内存不足）

**症状：** 容器/进程被 OOM Killer 杀死，`exit code 137`

```bash
# 查看内存使用
docker stats reddit-browser-worker --no-stream

# 增加 Docker 内存限制（修改 docker-compose.yml）
# memory: 2G → memory: 4G

# systemd 环境下增加 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 调低并发限制
MAX_CONCURRENT_BROWSERS=1
```
