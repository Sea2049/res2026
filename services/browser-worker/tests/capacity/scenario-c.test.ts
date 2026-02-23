/**
 * 场景 C：常规负载验证
 * 20 个 small 任务（target_comments=500）并发
 * 验证默认任务口径下吞吐与时延
 *
 * 前置条件：
 *   - browser-worker 服务已启动（WORKER_URL，默认 http://localhost:3001）
 *   - Next.js API 已启动（API_BASE，默认 http://localhost:3000）
 *   - 环境变量 WORKER_TOKEN 已配置（默认 changeme）
 *
 * 运行命令：
 *   npm run test:capacity:scenario-c
 *
 * 通过标准：
 *   - 整体成功率 >= 95%
 *   - small 任务排队等待 P95 <= 3 min
 *   - 分析延迟（总耗时）P95 <= 15 min（plan §1 要求）
 *   - 重复评论比例 <= 0.5%（plan §1 数据质量要求）
 *
 * 超时：20 分钟
 */

import {
  submitJobsBatch,
  waitForJobs,
  printScenarioReport,
  queueWaitMs,
  totalElapsedMs,
  p95,
  type JobResult,
} from "./helpers";
import type { CreateCrawlJobRequest } from "../../../../src/lib/types";

// ──────────────────────────────────────────────
// 场景常量
// ──────────────────────────────────────────────

const SMALL_COUNT = 20;
const SMALL_TARGET = 500;
const TIMEOUT_MS = 20 * 60 * 1000; // 20 min
const SCENARIO_NAME = "Scenario C: 常规负载验证 (20×500)";

// ──────────────────────────────────────────────
// 场景级状态
// ──────────────────────────────────────────────

let smallJobIds: string[] = [];
let allResults: Map<string, JobResult> = new Map();

// ──────────────────────────────────────────────
// 测试套件
// ──────────────────────────────────────────────

describe(SCENARIO_NAME, () => {
  beforeAll(async () => {
    const ts = Date.now();
    const configs: Partial<CreateCrawlJobRequest>[] = Array.from(
      { length: SMALL_COUNT },
      (_, i) => ({
        source: "reddit" as const,
        target_comments: SMALL_TARGET,
        max_comments: 25,
        analysis_scope: "full" as const,
        qos_class: "small" as const,
        priority: "normal" as const,
        idempotency_key: `scenario-c-small-${i}-${ts}`,
      })
    );

    smallJobIds = await submitJobsBatch(configs, 20);

    console.log(`[Scenario C] Submitted ${SMALL_COUNT} small jobs`);
    console.log(`[Scenario C] First job ID: ${smallJobIds[0]}`);
    console.log(`[Scenario C] Waiting up to 20 min for all jobs to complete…`);

    allResults = await waitForJobs(smallJobIds, TIMEOUT_MS);

    printScenarioReport(SCENARIO_NAME, allResults);
  }, TIMEOUT_MS + 60_000);

  // ── 用例 1：整体任务成功率 >= 95% ────────────────────────────────────────
  it(
    "整体任务成功率 >= 95%",
    () => {
      const results = Array.from(allResults.values());
      const successCount = results.filter(
        (r) => r.status === "completed" || r.status === "partial_success"
      ).length;
      const successRate = successCount / results.length;

      console.log(
        `[Scenario C] overall success: ${successCount}/${results.length} = ${(successRate * 100).toFixed(1)}%`
      );

      expect(successRate).toBeGreaterThanOrEqual(0.95);
    },
    TIMEOUT_MS
  );

  // ── 用例 2：small 任务排队等待 P95 <= 3 min ──────────────────────────────
  it(
    "small 任务排队等待 P95 <= 3 min",
    () => {
      const results = Array.from(allResults.values());
      const waitTimes = results.map((r) => queueWaitMs(r.timing));
      const p95WaitMs = p95(waitTimes);

      console.log(
        `[Scenario C] queue wait P95 = ${(p95WaitMs / 60000).toFixed(1)} min (threshold: 3 min)`
      );

      // 3 min = 180,000 ms
      expect(p95WaitMs).toBeLessThanOrEqual(3 * 60 * 1000);
    },
    TIMEOUT_MS
  );

  // ── 用例 3：分析延迟 P95 <= 15 min（plan §1 要求）────────────────────────
  it(
    "分析延迟 P95 <= 15 min（plan §1 要求）",
    () => {
      const results = Array.from(allResults.values());
      const elapsedTimes = results.map((r) => totalElapsedMs(r.timing));
      const p95ElapsedMs = p95(elapsedTimes);

      console.log(
        `[Scenario C] analysis elapsed P95 = ${(p95ElapsedMs / 60000).toFixed(1)} min (threshold: 15 min)`
      );

      // 15 min = 900,000 ms
      expect(p95ElapsedMs).toBeLessThanOrEqual(15 * 60 * 1000);
    },
    TIMEOUT_MS
  );

  // ── 用例 4：重复评论比例 <= 0.5%（plan §1 数据质量要求）──────────────────
  it(
    "重复评论比例 <= 0.5%（plan §1 数据质量要求）",
    () => {
      const results = Array.from(allResults.values());
      const totalAnalyzed = results.reduce(
        (s, r) => s + r.progress.analyzed_comments,
        0
      );
      const totalDuplicates = results.reduce(
        (s, r) => s + r.progress.duplicate_count,
        0
      );

      if (totalAnalyzed > 0) {
        const dupRate = totalDuplicates / totalAnalyzed;
        console.log(
          `[Scenario C] dup rate = ${(dupRate * 100).toFixed(3)}% (threshold: 0.5%)`
        );
        expect(dupRate).toBeLessThanOrEqual(0.005);
      } else {
        console.warn("[Scenario C] no analyzed comments, skipping duplicate check");
      }
    },
    TIMEOUT_MS
  );

  // ── 用例 5：HTTP 4xx 错误率 <= 5%（合理性检查）──────────────────────────
  it(
    "HTTP 4xx 错误率 <= 5%（合理性检查）",
    () => {
      const results = Array.from(allResults.values());
      const totalAnalyzed = results.reduce(
        (s, r) => s + r.progress.analyzed_comments,
        0
      );
      const total4xx = results.reduce(
        (s, r) => s + r.errors.http_403_count + r.errors.http_429_count,
        0
      );

      if (totalAnalyzed > 0) {
        const errRate = total4xx / totalAnalyzed;
        console.log(
          `[Scenario C] HTTP 4xx rate = ${(errRate * 100).toFixed(2)}% (threshold: 5%)`
        );
        expect(errRate).toBeLessThanOrEqual(0.05);
      }
    },
    TIMEOUT_MS
  );

  // ── 用例 6：吞吐量记录（信息性断言，至少有评论被分析）────────────────────
  it(
    "所有任务合计 analyzed_comments >= SMALL_COUNT * SMALL_TARGET * 0.9",
    () => {
      const results = Array.from(allResults.values());
      const totalAnalyzed = results.reduce(
        (s, r) => s + r.progress.analyzed_comments,
        0
      );
      const expectedMin = SMALL_COUNT * SMALL_TARGET * 0.9;

      console.log(
        `[Scenario C] total analyzed = ${totalAnalyzed} (min expected: ${expectedMin})`
      );

      expect(totalAnalyzed).toBeGreaterThanOrEqual(expectedMin);
    },
    TIMEOUT_MS
  );
});
