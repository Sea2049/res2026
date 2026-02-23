# 容量压测场景 (Capacity Tests)

本目录包含 plan §12 要求的三类容量验收场景的压测脚本。

---

## 前置条件

### 1. 服务启动

压测前必须启动以下两个服务：

```bash
# 终端 1：启动 Next.js API（默认 http://localhost:3000）
npm run dev

# 终端 2：启动 browser-worker（默认 http://localhost:3001）
cd services/browser-worker
npm run dev
```

### 2. 环境变量配置

| 变量名         | 默认值                  | 说明                        |
|---------------|------------------------|-----------------------------|
| `API_BASE`    | `http://localhost:3000` | Next.js API 服务地址         |
| `WORKER_URL`  | `http://localhost:3001` | browser-worker 服务地址      |
| `WORKER_TOKEN`| `changeme`              | Worker 鉴权 Token            |

示例：

```bash
export API_BASE=http://localhost:3000
export WORKER_URL=http://localhost:3001
export WORKER_TOKEN=your-token-here
```

---

## 运行命令

### 运行全部场景（串行）

```bash
cd services/browser-worker
npm run test:capacity
```

### 单独运行各场景

```bash
# 场景 A：上限能力验证（1×10000，约 45 min）
npm run test:capacity:scenario-a

# 场景 B：混部调度验证（5×2000 + 10×500，约 30 min）
npm run test:capacity:scenario-b

# 场景 C：常规负载验证（20×500，约 20 min）
npm run test:capacity:scenario-c
```

---

## 三大场景说明

### 场景 A：上限能力验证

| 参数            | 值                   |
|----------------|----------------------|
| 任务数          | 1                    |
| target_comments | 10000               |
| qos_class       | large               |
| 超时            | 45 min              |

**通过标准：**
- `status` 为 `completed` 或 `partial_success`
- `analyzed_comments >= 9500`（允许 5% 容差）
- HTTP 403+429 错误比率 <= 8%
- 重复评论比例 <= 5%
- 排队等待时间 <= 2 min

---

### 场景 B：混部调度验证

| 参数           | medium 组    | small 组     |
|---------------|--------------|--------------|
| 任务数         | 5            | 10           |
| target_comments| 2000        | 500          |
| qos_class      | medium      | small        |
| 超时           | 30 min（共享）| 30 min（共享）|

**通过标准：**
- small 任务成功率 >= **95%**
- medium 任务成功率 >= **90%**
- small 任务排队等待 P95 <= **8 min**
- medium 任务排队等待 P95 <= **15 min**

---

### 场景 C：常规负载验证

| 参数            | 值                  |
|----------------|---------------------|
| 任务数          | 20                  |
| target_comments | 500                |
| qos_class       | small              |
| 超时            | 20 min             |

**通过标准：**
- 整体成功率 >= **95%**
- 排队等待 P95 <= **3 min**（plan §12）
- 分析延迟（elapsed）P95 <= **15 min**（plan §1）
- 重复评论比例 <= **0.5%**（plan §1 数据质量）
- HTTP 4xx 错误率 <= **5%**

---

## 如何解读报告输出

压测完成后，每个场景都会在 stdout 打印类似以下报告：

```
════════════════════════════════════════════════════════════
📊  场景报告: Scenario C: 常规负载验证 (20×500)
════════════════════════════════════════════════════════════
  总任务数      : 20
  成功任务数    : 19
  失败任务数    : 1
  成功率        : 95.0%
  已分析评论数  : 9350
  重复评论比例  : 0.12%
  HTTP 4xx 比率 : 1.23% (403: 45, 429: 70)
  排队等待 P95  : 1.8 min
  总耗时   P95  : 8.5 min
════════════════════════════════════════════════════════════
```

**字段说明：**

| 字段           | 说明                                              |
|---------------|--------------------------------------------------|
| 成功率         | `(completed + partial_success) / total * 100%`   |
| 已分析评论数   | 所有任务 `progress.analyzed_comments` 之和        |
| 重复评论比例   | `duplicate_count / analyzed_comments * 100%`     |
| HTTP 4xx 比率  | `(http_403_count + http_429_count) / analyzed * 100%` |
| 排队等待 P95   | `started_at - queued_at` 的第 95 百分位值         |
| 总耗时 P95     | `timing.elapsed_seconds * 1000` 的第 95 百分位值  |

---

## CI 集成说明

### Nightly Job（非阻断性）

压测场景应作为 **nightly** 任务运行，而非阻断 PR CI：

```yaml
# .github/workflows/capacity-nightly.yml 示例
name: Capacity Tests (Nightly)

on:
  schedule:
    - cron: "0 2 * * *"   # 每天凌晨 2 点 UTC 运行
  workflow_dispatch:        # 允许手动触发

jobs:
  capacity:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci && cd services/browser-worker && npm ci

      - name: Start services
        run: |
          npm run dev &
          cd services/browser-worker && npm run dev &
          sleep 10  # 等待服务就绪

      - name: Run capacity tests
        env:
          API_BASE: http://localhost:3000
          WORKER_URL: http://localhost:3001
          WORKER_TOKEN: ${{ secrets.WORKER_TOKEN }}
          CI: "true"
        run: |
          cd services/browser-worker
          npm run test:capacity

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: capacity-test-results
          path: services/browser-worker/reports/capacity/
```

### 关键注意事项

1. **串行执行**：三个场景串行运行（`--runInBand`），避免资源竞争影响结果
2. **非阻断**：`continue-on-error: true` 可防止 nightly 失败影响主分支状态
3. **JUnit 报告**：设置 `CI=true` 环境变量可生成 `reports/capacity/capacity-results.xml`
4. **超时配置**：整体 CI 作业超时建议设置为 120 min（场景 A 45 + B 30 + C 20 + 余量）
