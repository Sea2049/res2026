/**
 * 任务结果存储（P1 第一段）
 * 默认采用“内存索引 + 磁盘分片持久化”模式，降低进程重启后的结果丢失风险，
 * 同时避免每次更新都重写一个巨大 JSON 文件。
 *
 * 说明：
 * - 持久化目录：<workspace>/cache/job-results/
 *   - <jobId>.meta.json     (summary + stats，不含 comments/items)
 *   - <jobId>.comments.json (SentimentComment[]，可分页读取)
 *   - <jobId>.items.json    (AnalysisItem[]，可分页读取)
 * - 测试环境（NODE_ENV=test）默认禁用磁盘持久化，避免测试间相互污染
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
  AnalysisItem,
  AnalysisResult,
  CrawlJobProgress,
  SentimentComment,
} from "./types";

/** 抓取统计（raw_fetched、unique_normalized 等口径） */
export interface FetchStats {
  raw_fetched: number;
  unique_normalized: number;
  analyzed_comments: number;
  completion_gap: number;
}

/** 单条结果项存储 */
export interface StoredAnalysisItem extends AnalysisItem {
  body?: string;
}

/** 按 jobId 存储的结果 */
export interface JobResultRecord {
  job_id: string;
  status: "running" | "completed" | "failed" | "partial_success";
  progress: CrawlJobProgress;
  /** NLP 完整分析结果（用于 summary 的 analysis_result） */
  analysis_result: AnalysisResult | null;
  /** 抓取口径统计 */
  fetch_stats: FetchStats;
  /** 分析后的评论列表，用于分页 items */
  items: StoredAnalysisItem[];
  /** 错误信息（failed 时） */
  error_message?: string;
  /** 完成时间 */
  completed_at?: string;
}

// ==================== JobResultsStore ====================

interface JobResultMetaRecord {
  job_id: string;
  status: JobResultRecord["status"];
  progress: CrawlJobProgress;
  fetch_stats: FetchStats;
  /** 仅用于 summary：不含 comments */
  analysis_result_summary: Omit<AnalysisResult, "comments"> | null;
  error_message?: string;
  completed_at?: string;
}

class JobResultsStore {
  private metaIndex = new Map<string, JobResultMetaRecord>();
  private readonly persistEnabled: boolean;
  private readonly storageDir: string;

  constructor() {
    this.persistEnabled = process.env.NODE_ENV !== "test";
    this.storageDir = join(process.cwd(), "cache", "job-results");
    this.loadMetaIndexFromDisk();
  }

  private ensureDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private metaPath(jobId: string): string {
    return join(this.storageDir, `${jobId}.meta.json`);
  }

  private commentsPath(jobId: string): string {
    return join(this.storageDir, `${jobId}.comments.json`);
  }

  private itemsPath(jobId: string): string {
    return join(this.storageDir, `${jobId}.items.json`);
  }

  private loadMetaIndexFromDisk(): void {
    if (!this.persistEnabled) return;
    try {
      if (!existsSync(this.storageDir)) return;
      const files = readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith(".meta.json")) continue;
        const full = join(this.storageDir, file);
        const content = readFileSync(full, "utf-8");
        if (!content.trim()) continue;
        const meta = JSON.parse(content) as JobResultMetaRecord;
        if (meta?.job_id) {
          this.metaIndex.set(meta.job_id, meta);
        }
      }
    } catch (error) {
      console.warn("[job-results-store] 加载持久化数据失败，已回退到内存模式:", error);
    }
  }

  private writeJsonAtomic(path: string, payload: unknown): void {
    const tempFile = `${path}.tmp`;
    writeFileSync(tempFile, JSON.stringify(payload), "utf-8");
    renameSync(tempFile, path);
  }

  private persistRecordToDisk(record: JobResultRecord): void {
    if (!this.persistEnabled) return;
    try {
      this.ensureDir();

      const analysisSummary: Omit<AnalysisResult, "comments"> | null = record.analysis_result
        ? {
            keywords: record.analysis_result.keywords,
            sentiment: record.analysis_result.sentiment,
            insights: record.analysis_result.insights,
            // comments 故意不落 meta，避免 summary 读取过大
          }
        : null;

      const meta: JobResultMetaRecord = {
        job_id: record.job_id,
        status: record.status,
        progress: record.progress,
        fetch_stats: record.fetch_stats,
        analysis_result_summary: analysisSummary,
        error_message: record.error_message,
        completed_at: record.completed_at,
      };

      this.writeJsonAtomic(this.metaPath(record.job_id), meta);
      this.writeJsonAtomic(
        this.commentsPath(record.job_id),
        record.analysis_result?.comments ?? []
      );
      this.writeJsonAtomic(
        this.itemsPath(record.job_id),
        record.items.map(({ body, ...rest }) => rest)
      );
    } catch (error) {
      console.warn("[job-results-store] 持久化失败，继续以内存模式运行:", error);
    }
  }

  set(record: JobResultRecord): void {
    const meta: JobResultMetaRecord = {
      job_id: record.job_id,
      status: record.status,
      progress: record.progress,
      fetch_stats: record.fetch_stats,
      analysis_result_summary: record.analysis_result
        ? {
            keywords: record.analysis_result.keywords,
            sentiment: record.analysis_result.sentiment,
            insights: record.analysis_result.insights,
          }
        : null,
      error_message: record.error_message,
      completed_at: record.completed_at,
    };
    this.metaIndex.set(record.job_id, meta);
    this.persistRecordToDisk(record);
  }

  getMeta(jobId: string): JobResultMetaRecord | undefined {
    const cached = this.metaIndex.get(jobId);
    if (cached) return cached;
    if (!this.persistEnabled) return undefined;

    // lazy load
    try {
      const path = this.metaPath(jobId);
      if (!existsSync(path)) return undefined;
      const content = readFileSync(path, "utf-8");
      const meta = JSON.parse(content) as JobResultMetaRecord;
      if (meta?.job_id) {
        this.metaIndex.set(meta.job_id, meta);
        return meta;
      }
    } catch (error) {
      console.warn("[job-results-store] meta lazy-load 失败:", error);
    }
    return undefined;
  }

  /** 分页获取 items */
  getItems(
    jobId: string,
    limit: number,
    cursor?: string
  ): {
    items: StoredAnalysisItem[];
    next_cursor: string | null;
  } {
    try {
      const path = this.itemsPath(jobId);
      if (!existsSync(path)) {
        return { items: [], next_cursor: null };
      }
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as AnalysisItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { items: [], next_cursor: null };
      }

      const start = cursor ? parseInt(cursor, 10) || 0 : 0;
      const slice = parsed.slice(start, start + limit) as StoredAnalysisItem[];
      const hasMore = start + limit < parsed.length;
      const nextCursor = hasMore ? String(start + limit) : null;

      return { items: slice, next_cursor: nextCursor };
    } catch (error) {
      console.warn("[job-results-store] items 读取失败:", error);
      return { items: [], next_cursor: null };
    }
  }

  /** 分页获取 comments（用于大结果分段查询） */
  getComments(
    jobId: string,
    limit: number,
    cursor?: string
  ): { comments: SentimentComment[]; next_cursor: string | null } {
    try {
      const path = this.commentsPath(jobId);
      if (!existsSync(path)) return { comments: [], next_cursor: null };
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as SentimentComment[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { comments: [], next_cursor: null };
      }

      const start = cursor ? parseInt(cursor, 10) || 0 : 0;
      const slice = parsed.slice(start, start + limit);
      const hasMore = start + limit < parsed.length;
      return { comments: slice, next_cursor: hasMore ? String(start + limit) : null };
    } catch (error) {
      console.warn("[job-results-store] comments 读取失败:", error);
      return { comments: [], next_cursor: null };
    }
  }

  clear(): void {
    this.metaIndex.clear();
    if (!this.persistEnabled || !existsSync(this.storageDir)) return;
    try {
      for (const file of readdirSync(this.storageDir)) {
        if (!file.endsWith(".json")) continue;
        try {
          unlinkSync(join(this.storageDir, file));
        } catch {
          // ignore per-file
        }
      }
    } catch (error) {
      console.warn("[job-results-store] 清理持久化目录失败:", error);
    }
  }

  get size(): number {
    return this.metaIndex.size;
  }
}

export const jobResultsStore = new JobResultsStore();
