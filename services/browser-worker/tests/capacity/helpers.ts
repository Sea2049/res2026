/**
 * 容量压测辅助函数
 * 提供任务提交、轮询等待、批量操作、统计计算等工具
 */

import type {
  CreateCrawlJobRequest,
  CrawlJob,
  CrawlJobProgress,
  CrawlJobTiming,
} from "../../../../src/lib/types";

const BASE_URL = process.env["WORKER_URL"] || "http://localhost:3001";
const API_BASE = process.env["API_BASE"] || "http://localhost:3000";
const TOKEN = process.env["WORKER_TOKEN"] || "changeme";

// ──────────────────────────────────────────────
// 内部工具
// ──────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };
}

export class TimeoutError extends Error {
  constructor(jobId: string, maxWaitMs: number) {
    super(`Job ${jobId} did not complete within ${maxWaitMs}ms`);
    this.name = "TimeoutError";
  }
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "partial_success",
  "archived",
]);

// ──────────────────────────────────────────────
// 提交单个任务
// ──────────────────────────────────────────────

/**
 * 提交任务，返回 job_id
 * 通过 POST /api/jobs/crawl
 */
export async function submitJob(
  config: Partial<CreateCrawlJobRequest>
): Promise<string> {
  const payload: CreateCrawlJobRequest = {
    source: "reddit",
    target_comments: 500,
    max_comments: 25,
    analysis_scope: "full",
    ...config,
  };

  const res = await fetch(`${API_BASE}/api/jobs/crawl`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `submitJob failed: HTTP ${res.status} – ${text.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as { job_id: string };
  if (!data.job_id) {
    throw new Error(`submitJob: response missing job_id: ${JSON.stringify(data)}`);
  }
  return data.job_id;
}

// ──────────────────────────────────────────────
// 轮询等待任务完成
// ──────────────────────────────────────────────

export interface JobResult {
  status: string;
  progress: CrawlJobProgress;
  timing: CrawlJobTiming;
  errors: CrawlJob["errors"];
}

/**
 * 轮询等待任务达到终态（completed/failed/cancelled/partial_success）
 * 超时 maxWaitMs 毫秒后抛出 TimeoutError
 */
export async function waitForJob(
  jobId: string,
  maxWaitMs: number,
  pollIntervalMs = 5000
): Promise<JobResult> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      // 404 等暂时性错误不立即终止，继续轮询
      if (res.status !== 404) {
        const text = await res.text();
        throw new Error(
          `waitForJob poll failed: HTTP ${res.status} – ${text.slice(0, 200)}`
        );
      }
    } else {
      const job = (await res.json()) as CrawlJob;
      if (TERMINAL_STATUSES.has(job.status)) {
        return {
          status: job.status,
          progress: job.progress,
          timing: job.timing,
          errors: job.errors,
        };
      }
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(pollIntervalMs, remaining));
  }

  throw new TimeoutError(jobId, maxWaitMs);
}

// ──────────────────────────────────────────────
// 批量提交任务
// ──────────────────────────────────────────────

/**
 * 并发提交多个任务，返回所有 job_id
 * concurrency 控制最大并发数，默认 10
 */
export async function submitJobsBatch(
  configs: Partial<CreateCrawlJobRequest>[],
  concurrency = 10
): Promise<string[]> {
  const results: string[] = new Array(configs.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = index++;
      if (i >= configs.length) return;
      results[i] = await submitJob(configs[i]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, configs.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────────
// 等待多个任务全部完成
// ──────────────────────────────────────────────

/**
 * 等待多个任务全部完成，返回 job_id -> 结果 Map
 * 超时按 maxWaitMs 整体控制（所有任务共享同一个 deadline）
 */
export async function waitForJobs(
  jobIds: string[],
  maxWaitMs: number
): Promise<Map<string, JobResult>> {
  const promises = jobIds.map((id) => waitForJob(id, maxWaitMs));
  const settled = await Promise.allSettled(promises);

  const resultMap = new Map<string, JobResult>();
  settled.forEach((s, idx) => {
    const jobId = jobIds[idx]!;
    if (s.status === "fulfilled") {
      resultMap.set(jobId, s.value);
    } else {
      // 超时或异常：将其记录为 failed 状态，确保后续断言可以检测到
      resultMap.set(jobId, {
        status: "failed",
        progress: {
          raw_fetched: 0,
          unique_normalized: 0,
          analyzed_comments: 0,
          completion_gap: 0,
          duplicate_count: 0,
          invalid_count: 0,
        },
        timing: {
          queued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          elapsed_seconds: maxWaitMs / 1000,
        },
        errors: {
          http_403_count: 0,
          http_429_count: 0,
          retry_count: 0,
        },
      });
    }
  });
  return resultMap;
}

// ──────────────────────────────────────────────
// 统计工具
// ──────────────────────────────────────────────

/**
 * 计算数组的第 95 百分位值（P95）
 * 数组为空时返回 0
 */
export function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)]!;
}

/**
 * 计算等待时间（ms）：从 queued_at 到 started_at 的差值
 * 若 started_at 不存在则用 updated_at 代替
 */
export function queueWaitMs(timing: CrawlJobTiming): number {
  const startTs = timing.started_at ?? timing.updated_at;
  return Math.max(0, new Date(startTs).getTime() - new Date(timing.queued_at).getTime());
}

/**
 * 计算总耗时（ms）：elapsed_seconds 转换
 */
export function totalElapsedMs(timing: CrawlJobTiming): number {
  return timing.elapsed_seconds * 1000;
}

// ──────────────────────────────────────────────
// 报告输出
// ──────────────────────────────────────────────

/**
 * 输出场景报告到 stdout
 */
export function printScenarioReport(
  scenarioName: string,
  results: Map<string, JobResult>
): void {
  const total = results.size;
  const entries = Array.from(results.values());

  const successCount = entries.filter(
    (r) => r.status === "completed" || r.status === "partial_success"
  ).length;
  const failedCount = entries.filter(
    (r) => r.status === "failed" || r.status === "cancelled"
  ).length;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;

  const waitTimes = entries.map((r) => queueWaitMs(r.timing));
  const elapsedTimes = entries.map((r) => totalElapsedMs(r.timing));
  const analyzedComments = entries.map((r) => r.progress.analyzed_comments);
  const duplicateCounts = entries.map((r) => r.progress.duplicate_count);

  const totalAnalyzed = analyzedComments.reduce((s, v) => s + v, 0);
  const totalDuplicates = duplicateCounts.reduce((s, v) => s + v, 0);
  const duplicateRatio = totalAnalyzed > 0 ? (totalDuplicates / totalAnalyzed) * 100 : 0;

  const total403 = entries.reduce((s, r) => s + r.errors.http_403_count, 0);
  const total429 = entries.reduce((s, r) => s + r.errors.http_429_count, 0);
  const httpErrRate =
    totalAnalyzed > 0 ? ((total403 + total429) / totalAnalyzed) * 100 : 0;

  console.log("\n" + "═".repeat(60));
  console.log(`📊  场景报告: ${scenarioName}`);
  console.log("═".repeat(60));
  console.log(`  总任务数      : ${total}`);
  console.log(`  成功任务数    : ${successCount}`);
  console.log(`  失败任务数    : ${failedCount}`);
  console.log(`  成功率        : ${successRate.toFixed(1)}%`);
  console.log(`  已分析评论数  : ${totalAnalyzed}`);
  console.log(`  重复评论比例  : ${duplicateRatio.toFixed(2)}%`);
  console.log(`  HTTP 4xx 比率 : ${httpErrRate.toFixed(2)}% (403: ${total403}, 429: ${total429})`);
  console.log(`  排队等待 P95  : ${(p95(waitTimes) / 60000).toFixed(1)} min`);
  console.log(`  总耗时   P95  : ${(p95(elapsedTimes) / 60000).toFixed(1)} min`);
  console.log("═".repeat(60) + "\n");
}

// ──────────────────────────────────────────────
// 内部工具
// ──────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 导出供外部使用
export { BASE_URL, API_BASE, TOKEN };
