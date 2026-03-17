/**
 * 任务状态机驱动器
 *
 * 负责：
 * 1. submitJob()  - 接收配置 → 创建任务 → 拆分子任务 → 入调度队列
 * 2. start()      - 启动轮询循环，每 POLL_INTERVAL_MS 从调度器取一个子任务分配给 worker
 * 3. stop()       - 优雅关闭轮询循环
 * 4. cancelJob()  - 取消任务并持久化原因
 * 5. processTask() - 调用 WorkerPool 抓取，结果写 commentRepo，失败则 nack
 * 6. updateJobProgress() - 聚合子任务结果，判断任务完成 / 超时
 */

import type {
  CrawlJob,
  CrawlJobConfig,
  CrawlJobProgress,
  JobStatus,
} from "../../../../src/lib/types";
import {
  createJob,
  getJob,
  updateJobStatus,
  updateJobProgress as persistProgress,
  cancelJob as persistCancelJob,
} from "../storage/job-repo";
import {
  saveRawComment,
  saveNormalizedComment,
  countNormalizedComments,
} from "../storage/comment-repo";
import type { NormalizedComment } from "../storage/comment-repo";
import { InMemoryQueue } from "../queue/in-memory-queue";
import { JobScheduler, QosLevel } from "./job-scheduler";
import { splitJob } from "./job-splitter";
import type { CrawlTaskSplit } from "./job-splitter";
import type { WorkerPool, RawComment } from "./worker-pool";

/** 轮询间隔 */
const POLL_INTERVAL_MS = 500;

/** 默认任务超时（分钟） */
const DEFAULT_TIMEOUT_MINUTES = 60;

/** 将 QosClass 映射为调度器级别 */
function toQosLevel(qosClass: string): QosLevel {
  switch (qosClass) {
    case "realtime":
      return "small";
    case "batch":
      return "medium";
    case "background":
      return "large";
    default:
      return "medium";
  }
}

/** 根据 subreddit 和排序构造 Reddit JSON API URL */
function buildFetchUrl(task: CrawlTaskSplit): string {
  const sub = task.subreddit ?? "all";
  const sort = task.sort ?? "hot";
  const base = `https://www.reddit.com/r/${sub}/${sort}.json?limit=100`;
  return task.cursor_after ? `${base}&after=${task.cursor_after}` : base;
}

/** 将 RawComment 转换为规范化格式 */
function toNormalized(raw: RawComment, jobId: string): NormalizedComment {
  return {
    comment_id: raw.id,
    job_id: jobId,
    post_id: raw.post_id,
    subreddit: raw.subreddit,
    author: raw.author,
    body: raw.body,
    created_utc: raw.created_utc,
    normalized_at: new Date().toISOString(),
  };
}

/** 正在执行的任务元信息 */
interface ActiveJobMeta {
  config: CrawlJobConfig;
  qosLevel: QosLevel;
  startedAtMs: number;
  timeoutMs: number;
  /** 子任务 taskId → qosLevel 的映射，用于 ack/nack */
  taskQosMap: Map<string, QosLevel>;
  /** 取消信号控制器，cancelJob() 调用时触发 */
  abortController: AbortController;
}

export class JobRunner {
  private scheduler: JobScheduler;
  private workerPool: WorkerPool;
  private analysisQueue: InMemoryQueue<string>;

  /** jobId → ActiveJobMeta */
  private activeJobs: Map<string, ActiveJobMeta> = new Map();

  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private jobRepo: {
      createJob: typeof createJob;
      getJob: typeof getJob;
      updateJobStatus: typeof updateJobStatus;
      updateJobProgress: typeof persistProgress;
      cancelJob: typeof persistCancelJob;
    },
    schedulerOrWorkerPool: JobScheduler | WorkerPool,
    workerPoolOrAnalysisQueue: WorkerPool | InMemoryQueue<string>,
    analysisQueueOrNothing?: InMemoryQueue<string>
  ) {
    // 支持两种构造签名：
    // new JobRunner(jobRepo, scheduler, workerPool, analysisQueue)
    // new JobRunner(jobRepo, workerPool, analysisQueue)
    if (schedulerOrWorkerPool instanceof JobScheduler) {
      this.scheduler = schedulerOrWorkerPool;
      this.workerPool = workerPoolOrAnalysisQueue as WorkerPool;
      this.analysisQueue = analysisQueueOrNothing!;
    } else {
      this.scheduler = new JobScheduler();
      this.workerPool = schedulerOrWorkerPool as WorkerPool;
      this.analysisQueue = workerPoolOrAnalysisQueue as InMemoryQueue<string>;
    }
  }

  // ── 公共 API ──────────────────────────────────────────────

  /**
   * 提交新任务：入库 → 拆分子任务 → 入调度队列
   */
  async submitJob(config: CrawlJobConfig): Promise<CrawlJob> {
    try {
      const job = this.jobRepo.createJob(config);
      const qosLevel = toQosLevel(config.qos_class ?? "batch");

      const timeoutMs =
        (config.runtime?.timeout_minutes ?? DEFAULT_TIMEOUT_MINUTES) * 60_000;

      // 拆分子任务（将 config.filters 传入，因为 CrawlJob 不含 filters 字段）
      const tasks = splitJob(job, config.filters);
      const taskQosMap = new Map<string, QosLevel>();
      for (const t of tasks) {
        taskQosMap.set(t.task_id, qosLevel);
      }

      this.activeJobs.set(job.job_id, {
        config,
        qosLevel,
        startedAtMs: 0, // 任务未开始时为 0
        timeoutMs,
        taskQosMap,
        abortController: new AbortController(),
      });

      this.scheduler.schedule(tasks, qosLevel);
      return job;
    } catch (err) {
      throw new Error(
        `submitJob failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * 启动工作循环（轮询调度队列）
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.pollTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        await this._tick();
      } catch (err) {
        console.error("[JobRunner] tick error:", err);
      }
    }, POLL_INTERVAL_MS);
  }

  /**
   * 停止工作循环（等待当前 tick 完成）
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    await this.workerPool.shutdown();
  }

  /**
   * 取消任务
   */
  async cancelJob(jobId: string, reason: string): Promise<void> {
    try {
      this.jobRepo.cancelJob(jobId, reason);
      // Signal any in-flight fetches for this job to abort gracefully
      this.activeJobs.get(jobId)?.abortController.abort();
      this.activeJobs.delete(jobId);
    } catch (err) {
      throw new Error(
        `cancelJob(${jobId}) failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── 私有实现 ──────────────────────────────────────────────

  /** 每次轮询：若有空闲 worker，从调度器取任务并执行 */
  private async _tick(): Promise<void> {
    if (this.workerPool.availableSlots() <= 0) return;

    const task = this.scheduler.next();
    if (!task) return;

    // 更新任务为 running（首次）
    const meta = this.activeJobs.get(task.job_id);
    if (meta && meta.startedAtMs === 0) {
      meta.startedAtMs = Date.now();
      this.jobRepo.updateJobStatus(task.job_id, "running" as JobStatus);
    }

    // 异步执行，不阻塞下一个 tick
    this._processTask(task).catch((err) => {
      console.error(`[JobRunner] processTask(${task.task_id}) unhandled:`, err);
    });
  }

  /**
   * 处理单个爬取子任务
   * 成功 → 保存评论 → ack → 更新进度
   * 失败 → nack（自动重试或死信）
   */
  private async _processTask(task: CrawlTaskSplit): Promise<void> {
    const meta = this.activeJobs.get(task.job_id);
    const qosLevel = meta?.taskQosMap.get(task.task_id) ?? "medium";
    const url = buildFetchUrl(task);

    // Use per-job abort signal so cancelJob() can interrupt in-flight fetches
    const signal = meta?.abortController.signal;

    // Skip processing if already cancelled
    if (signal?.aborted) return;

    // Read limit from job config; fall back to task's estimated count then 100
    const limit =
      meta?.config.target_comments ??
      task.estimated_comments ??
      100;

    try {
      const result = await this.workerPool.fetch(url, {
        timeout: 30_000,
        forceHttp: false,
        limit,
        signal,
      });

      // If cancelled mid-flight, silently discard without nack
      if (signal?.aborted) return;

      if (!result.ok) {
        throw new Error(
          `fetch failed [${result.error_code ?? "UNKNOWN"}]: ${result.error_message ?? ""}`
        );
      }

      // 保存评论
      for (const raw of result.comments ?? []) {
        try {
          await saveRawComment(task.job_id, task.task_id, raw.id, raw, {
            url,
            strategy: result.fetched_via,
            latency_ms: result.duration_ms,
          });
          const saved = await saveNormalizedComment(toNormalized(raw, task.job_id));
          if (saved) {
            this.analysisQueue.enqueue(raw.id);
          }
        } catch (saveErr) {
          console.warn(`[JobRunner] save comment ${raw.id} error:`, saveErr);
        }
      }

      this.scheduler.ack(task.task_id, qosLevel);
      await this._updateJobProgress(task.job_id);
    } catch (err) {
      // Suppress errors caused by intentional cancellation
      if (signal?.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[JobRunner] task ${task.task_id} nack:`, error.message);
      this.scheduler.nack(task.task_id, qosLevel, error);
      // 记录错误但不更新任务为 failed（重试机会还在）
    }
  }

  /**
   * 聚合子任务结果，更新任务进度
   * 完成判定：analyzed_comments >= target_comments 或超时
   */
  private async _updateJobProgress(jobId: string): Promise<void> {
    try {
      const job = this.jobRepo.getJob(jobId);
      if (!job) return;
      if (
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        return;
      }

      const normalizedCount = await countNormalizedComments(jobId);
      const targetComments = job.target_comments;

      const progress: CrawlJobProgress = {
        raw_fetched: normalizedCount,
        unique_normalized: normalizedCount,
        analyzed_comments: normalizedCount,
        completion_gap: Math.max(0, targetComments - normalizedCount),
        duplicate_count: 0,
        invalid_count: 0,
      };

      this.jobRepo.updateJobProgress(jobId, progress);

      // 检查完成条件
      if (normalizedCount >= targetComments) {
        this.jobRepo.updateJobStatus(jobId, "completed" as JobStatus);
        this.activeJobs.delete(jobId);
        return;
      }

      // 检查超时
      const meta = this.activeJobs.get(jobId);
      if (meta && meta.startedAtMs > 0) {
        const elapsed = Date.now() - meta.startedAtMs;
        if (elapsed >= meta.timeoutMs) {
          this.jobRepo.updateJobStatus(jobId, "failed" as JobStatus, {
            errorsJson: JSON.stringify([
              `timeout after ${Math.round(elapsed / 1000)}s, collected ${normalizedCount}/${targetComments}`,
            ]),
          });
          this.activeJobs.delete(jobId);
        }
      }
    } catch (err) {
      console.error(`[JobRunner] updateJobProgress(${jobId}) error:`, err);
    }
  }
}

/**
 * 便捷工厂函数：使用存储模块的实际实现创建 JobRunner
 */
export function createJobRunner(
  workerPool: WorkerPool,
  analysisQueue?: InMemoryQueue<string>
): JobRunner {
  return new JobRunner(
    {
      createJob,
      getJob,
      updateJobStatus,
      updateJobProgress: persistProgress,
      cancelJob: persistCancelJob,
    },
    new JobScheduler(),
    workerPool,
    analysisQueue ?? new InMemoryQueue<string>()
  );
}
