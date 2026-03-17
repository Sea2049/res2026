/**
 * 任务内存存储
 * 提供跨 API 路由的任务状态共享（单实例进程内）
 * 开发模式下通过 globalThis 持久化，避免 HMR 热更新清空导致轮询 404
 */

import type { CrawlJob, JobStatus } from "./types";

// ==================== JobStore 类 ====================

class JobStore {
  private jobs = new Map<string, CrawlJob>();

  /**
   * 存储或更新任务
   */
  set(job: CrawlJob): void {
    this.jobs.set(job.job_id, job);
  }

  /**
   * 按 job_id 查询任务
   */
  get(jobId: string): CrawlJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 局部更新任务字段，返回更新后的任务
   */
  update(jobId: string, patch: Partial<CrawlJob>): CrawlJob | undefined {
    const existing = this.jobs.get(jobId);
    if (!existing) return undefined;
    const updated: CrawlJob = { ...existing, ...patch };
    this.jobs.set(jobId, updated);
    return updated;
  }

  /**
   * 按可选条件列出任务
   */
  list(filter?: { status?: JobStatus }): CrawlJob[] {
    const all = Array.from(this.jobs.values());
    if (!filter) return all;
    return all.filter((job) => {
      if (filter.status && job.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * 获取当前存储的任务总数（用于监控/调试）
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * 清空所有任务（主要用于测试）
   */
  clear(): void {
    this.jobs.clear();
  }
}

// 开发模式下 HMR 会重新执行模块，导致 jobStore 被重置、轮询 GET /api/jobs/:id 返回 404
// 使用 globalThis 保留同一进程内的 store，避免热更新后任务丢失
const globalKey = "__RES2026_JOB_STORE__";
declare const globalThis: { [key: string]: JobStore | undefined };
const jobStore =
  typeof globalThis[globalKey] !== "undefined"
    ? globalThis[globalKey]!
    : (globalThis[globalKey] = new JobStore());

export { jobStore };
