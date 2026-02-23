import { getDb } from "../storage/db";
import type { NormalizedComment } from "../storage/comment-repo";
import type { AnalysisResult } from "../storage/analysis-repo";
import { saveAnalysisResult } from "../storage/analysis-repo";
import { InMemoryQueue } from "../queue/in-memory-queue";
import { analyzeComment } from "./comment-analyzer";

// 字符串优先级 → 数值（供 analysis_results.priority 字段存储）
const PRIORITY_SCORE: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * 依赖接口：通过 commentRepo 对象访问评论存储。
 * 与 storage/comment-repo 模块兼容；如需按 ID 查询，consumer
 * 内部通过 getDb() 直接执行，避免修改已有存储层。
 */
export interface CommentRepo {
  getNormalizedComments(
    jobId: string,
    limit?: number,
    cursor?: string
  ): NormalizedComment[];
}

/**
 * 依赖接口：通过 analysisRepo 对象写入分析结果。
 */
export interface AnalysisRepo {
  saveAnalysisResult(result: AnalysisResult): void;
}

/**
 * 按 comment_id 精确查询已规范化评论。
 * 直接访问 SQLite，无需修改存储层接口。
 */
function fetchNormalizedCommentById(
  commentId: string
): NormalizedComment | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM comments_normalized WHERE comment_id = ?")
    .get(commentId) as NormalizedComment | undefined;
  return row ?? null;
}

/**
 * AnalysisConsumer 驱动分析流水线：
 *   queue (comment_id) → 读取规范化评论 → 分析 → 写入 analysis_results
 *
 * 消费策略：每 200ms 批量取最多 10 条，并发处理。
 */
export class AnalysisConsumer {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private commentRepo: CommentRepo,
    private analysisRepo: AnalysisRepo,
    private queue: InMemoryQueue<string>
  ) {}

  /** 启动消费循环 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  /** 停止消费循环 */
  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      try {
        await this.tick();
      } finally {
        this.scheduleNext();
      }
    }, 200);
  }

  private async tick(): Promise<void> {
    const batch: Array<{ msgId: string; commentId: string }> = [];

    for (let i = 0; i < 10; i++) {
      const msg = this.queue.dequeue();
      if (!msg) break;
      batch.push({ msgId: msg.id, commentId: msg.payload });
    }

    if (batch.length === 0) return;

    await Promise.all(
      batch.map(({ msgId, commentId }) => this.processOne(msgId, commentId))
    );
  }

  /** 处理单条评论：查询 → 分析 → 入库 */
  private async processOne(
    msgId: string,
    commentId: string
  ): Promise<void> {
    try {
      const comment = fetchNormalizedCommentById(commentId);

      if (!comment) {
        // 评论不存在（可能已被清理），直接 ack 跳过
        this.queue.ack(msgId);
        return;
      }

      const result = analyzeComment(comment);

      this.analysisRepo.saveAnalysisResult({
        comment_id: result.comment_id,
        analysis_version: result.analysis_version,
        sentiment: result.sentiment,
        keywords_json: JSON.stringify(result.keywords),
        insight_type: result.insight_type,
        priority: PRIORITY_SCORE[result.priority] ?? 1,
        analyzed_at: new Date().toISOString(),
      });

      this.queue.ack(msgId);
    } catch (err) {
      this.queue.nack(
        msgId,
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}
