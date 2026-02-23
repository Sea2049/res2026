/**
 * 场景 B：混部调度验证
 * 5 个 medium 任务（target_comments=2000）+ 10 个 small 任务（target_comments=500）并发
 * 验证小任务不被大任务饿死
 *
 * 前置条件：
 *   - browser-worker 服务已启动（WORKER_URL，默认 http://localhost:3001）
 *   - Next.js API 已启动（API_BASE，默认 http://localhost:3000）
 *   - 环境变量 WORKER_TOKEN 已配置（默认 changeme）
 *
 * 运行命令：
 *   npm run test:capacity:scenario-b
 *
 * 通过标准：
 *   - small 任务成功率 >= 95%
 *   - medium 任务成功率 >= 90%
 *   - small 任务排队等待 P95 <= 8 min
 *
 * 超时：30 分钟
 */

import {
  submitJobsBatch,
  waitForJobs,
  printScenarioReport,
  queueWaitMs,
  p95,
  type JobResult,
} from "./helpers";
import type { CreateCrawlJobRequest } from "../../../../src/lib/types";

// ──────────────────────────────────────────────
// 场景常量
// ──────────────────────────────────────────────

const MEDIUM_COUNT = 5;
const SMALL_COUNT = 10;
const MEDIUM_TARGET = 2000;
const SMALL_TARGET = 500;
const TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const SCENARIO_NAME = "Scenario B: 混部调度验证 (5×2000 + 10×500)";

// ──────────────────────────────────────────────
// 场景级状态
// ──────────────────────────────────────────────

let mediumJobIds: string[] = [];
let smallJobIds: string[] = [];
let allResults: Map<string, JobResult> = new Map();

// ──────────────────────────────────────────────
// 测试套件
// ──────────────────────────────────────────────

describe(SCENARIO_NAME, () => {
  beforeAll(async () => {
    // 构建 medium 任务配置（5×2000）
    const mediumConfigs: Partial<CreateCrawlJobRequest>[] = Array.from(
      { length: MEDIUM_COUNT },
      (_, i) => ({
        source: "reddit" as const,
        target_comments: MEDIUM_TARGET,
        max_comments: 50,
        analysis_scope: "full" as const,
        qos_class: "medium" as const,
        priority: "normal" as const,
        idempotency_key: `scenario-b-medium-${i}-${Date.now()}`,
      })
    );

    // 构建 small 任务配置（10×500）
    const smallConfigs: Partial<CreateCrawlJobRequest>[] = Array.from(
      { length: SMALL_COUNT },
      (_, i) => ({
        source: "reddit" as const,
        target_comments: SMALL_TARGET,
        max_comments: 25,
        analysis_scope: "full" as const,
        qos_class: "small" as const,
        priority: "normal" as const,
        idempotency_key: `scenario-b-small-${i}-${Date.now()}`,
      })
    );

    // 并发提交所有任务（medium + small 混合，模拟真实混部场景）
    const allConfigs = [...mediumConfigs, ...smallConfigs];
    const allJobIds = await submitJobsBatch(allConfigs, 15);

    mediumJobIds = allJobIds.slice(0, MEDIUM_COUNT);
    smallJobIds = allJobIds.slice(MEDIUM_COUNT);

    console.log(`[Scenario B] Submitted ${MEDIUM_COUNT} medium jobs: ${mediumJobIds.join(", ")}`);
    console.log(`[Scenario B] Submitted ${SMALL_COUNT} small jobs: ${smallJobIds.join(", ")}`);
    console.log(`[Scenario B] Waiting up to 30 min for all jobs to complete…`);

    // 等待所有任务完成
    allResults = await waitForJobs(allJobIds, TIMEOUT_MS);

    printScenarioReport(SCENARIO_NAME, allResults);
  }, TIMEOUT_MS + 60_000);

  // ── 用例 1：small 任务成功率 >= 95% ─────────────────────────────────────
  it(
    "small 任务 (10×500) 成功率 >= 95%",
    () => {
      const smallResults = smallJobIds.map((id) => allResults.get(id)!);
      const successCount = smallResults.filter(
        (r) => r.status === "completed" || r.status === "partial_success"
      ).length;
      const successRate = successCount / smallResults.length;

      console.log(
        `[Scenario B] small success: ${successCount}/${smallResults.length} = ${(successRate * 100).toFixed(1)}%`
      );

      expect(successRate).toBeGreaterThanOrEqual(0.95);
    },
    TIMEOUT_MS
  );

  // ── 用例 2：medium 任务成功率 >= 90% ────────────────────────────────────
  it(
    "medium 任务 (5×2000) 成功率 >= 90%",
    () => {
      const mediumResults = mediumJobIds.map((id) => allResults.get(id)!);
      const successCount = mediumResults.filter(
        (r) => r.status === "completed" || r.status === "partial_success"
      ).length;
      const successRate = successCount / mediumResults.length;

      console.log(
        `[Scenario B] medium success: ${successCount}/${mediumResults.length} = ${(successRate * 100).toFixed(1)}%`
      );

      expect(successRate).toBeGreaterThanOrEqual(0.90);
    },
    TIMEOUT_MS
  );

  // ── 用例 3：small 任务不因 medium 任务而超时，P95 排队等待 <= 8 min ──────
  it(
    "small 任务不因 medium 任务而超时：排队等待 P95 <= 8 min",
    () => {
      const smallResults = smallJobIds.map((id) => allResults.get(id)!);
      const waitTimes = smallResults.map((r) => queueWaitMs(r.timing));
      const p95WaitMs = p95(waitTimes);

      console.log(
        `[Scenario B] small queue wait P95 = ${(p95WaitMs / 60000).toFixed(1)} min (threshold: 8 min)`
      );

      // 8 min = 480,000 ms
      expect(p95WaitMs).toBeLessThanOrEqual(8 * 60 * 1000);
    },
    TIMEOUT_MS
  );

  // ── 用例 4：medium 任务排队等待 P95 <= 15 min（合理性检查）──────────────
  it(
    "medium 任务排队等待 P95 <= 15 min",
    () => {
      const mediumResults = mediumJobIds.map((id) => allResults.get(id)!);
      const waitTimes = mediumResults.map((r) => queueWaitMs(r.timing));
      const p95WaitMs = p95(waitTimes);

      console.log(
        `[Scenario B] medium queue wait P95 = ${(p95WaitMs / 60000).toFixed(1)} min (threshold: 15 min)`
      );

      expect(p95WaitMs).toBeLessThanOrEqual(15 * 60 * 1000);
    },
    TIMEOUT_MS
  );

  // ── 用例 5：数据质量 - small 任务重复评论比例 <= 1% ─────────────────────
  it(
    "small 任务数据质量：重复评论比例 <= 1%",
    () => {
      const smallResults = smallJobIds.map((id) => allResults.get(id)!);
      const totalAnalyzed = smallResults.reduce(
        (s, r) => s + r.progress.analyzed_comments,
        0
      );
      const totalDuplicates = smallResults.reduce(
        (s, r) => s + r.progress.duplicate_count,
        0
      );

      if (totalAnalyzed > 0) {
        const dupRate = totalDuplicates / totalAnalyzed;
        console.log(
          `[Scenario B] small dup rate = ${(dupRate * 100).toFixed(2)}%`
        );
        expect(dupRate).toBeLessThanOrEqual(0.01);
      }
    },
    TIMEOUT_MS
  );
});
