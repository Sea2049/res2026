/**
 * 场景 A：上限能力验证
 * 提交 1 个 target_comments=10000 任务，验证完成并达到容量上限
 *
 * 前置条件：
 *   - browser-worker 服务已启动（WORKER_URL，默认 http://localhost:3001）
 *   - Next.js API 已启动（API_BASE，默认 http://localhost:3000）
 *   - 环境变量 WORKER_TOKEN 已配置（默认 changeme）
 *
 * 运行命令：
 *   npm run test:capacity:scenario-a
 *
 * 超时：45 分钟
 */

import {
  submitJob,
  waitForJob,
  printScenarioReport,
  queueWaitMs,
  p95,
  type JobResult,
} from "./helpers";

// ──────────────────────────────────────────────
// 场景级状态（在 describe 内共享）
// ──────────────────────────────────────────────

let jobId: string;
let jobResult: JobResult;

const SCENARIO_NAME = "Scenario A: 上限能力验证 (1 × 10000)";
const TIMEOUT_MS = 45 * 60 * 1000; // 45 min

// ──────────────────────────────────────────────
// 测试套件
// ──────────────────────────────────────────────

describe(SCENARIO_NAME, () => {
  // 只提交一次任务，所有 it 共用同一个 job_id
  beforeAll(async () => {
    jobId = await submitJob({
      source: "reddit",
      target_comments: 10000,
      max_comments: 100,
      analysis_scope: "full",
      qos_class: "large",
      priority: "normal",
    });

    console.log(`[Scenario A] Job submitted: ${jobId}`);
    console.log(`[Scenario A] Waiting up to 45 min for completion…`);

    jobResult = await waitForJob(jobId, TIMEOUT_MS, 30_000);

    console.log(`[Scenario A] Job finished: status=${jobResult.status}`);
    printScenarioReport(
      SCENARIO_NAME,
      new Map([[jobId, jobResult]])
    );
  }, TIMEOUT_MS + 60_000); // beforeAll 超时略大于任务超时

  // ── 用例 1：任务完成，analyzed_comments 达标 ──────────────────────────────
  it(
    "提交 10000 评论任务并完成，analyzed_comments >= 9500（允许 5% 容差）",
    () => {
      // 允许 completed 或 partial_success（partial 表示部分成功仍达标）
      expect(["completed", "partial_success"]).toContain(jobResult.status);

      const { analyzed_comments } = jobResult.progress;
      console.log(`[Scenario A] analyzed_comments = ${analyzed_comments}`);
      expect(analyzed_comments).toBeGreaterThanOrEqual(9500);
    },
    TIMEOUT_MS
  );

  // ── 用例 2：HTTP 4xx 错误率 <= 8% ─────────────────────────────────────────
  it(
    "HTTP 403+429 错误比率 <= 8%（job_success_rate 指标）",
    () => {
      const { analyzed_comments } = jobResult.progress;
      const { http_403_count, http_429_count } = jobResult.errors;
      const httpErrCount = http_403_count + http_429_count;

      console.log(
        `[Scenario A] http_403=${http_403_count}, http_429=${http_429_count}, analyzed=${analyzed_comments}`
      );

      if (analyzed_comments > 0) {
        const errRate = httpErrCount / analyzed_comments;
        expect(errRate).toBeLessThanOrEqual(0.08);
      } else {
        // 若无任何分析结果则绝对值不应过大（保底检查）
        expect(httpErrCount).toBeLessThanOrEqual(800);
      }
    },
    TIMEOUT_MS
  );

  // ── 用例 3：任务总耗时记录（信息性断言） ─────────────────────────────────
  it(
    "排队等待时间 <= 2 min（大任务不被限流拒绝）",
    () => {
      const waitMs = queueWaitMs(jobResult.timing);
      console.log(`[Scenario A] queue wait = ${(waitMs / 60000).toFixed(1)} min`);
      // 大任务允许较宽松的等待阈值（2 min）
      expect(waitMs).toBeLessThanOrEqual(2 * 60 * 1000);
    },
    TIMEOUT_MS
  );

  // ── 用例 4：无重复评论超限（数据质量） ────────────────────────────────────
  it(
    "重复评论比例 <= 5%（上限任务数据质量）",
    () => {
      const { analyzed_comments, duplicate_count } = jobResult.progress;
      if (analyzed_comments > 0) {
        const dupRate = duplicate_count / analyzed_comments;
        console.log(
          `[Scenario A] duplicate_rate = ${(dupRate * 100).toFixed(2)}%`
        );
        expect(dupRate).toBeLessThanOrEqual(0.05);
      }
    },
    TIMEOUT_MS
  );
});
