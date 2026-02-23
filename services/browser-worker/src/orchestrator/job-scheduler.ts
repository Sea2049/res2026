/**
 * QoS 公平调度器
 *
 * 维护三条优先级队列（small / medium / large），按比例 50%:30%:20% 轮询分发。
 * 通过 token 计数器实现加权公平队列（WFQ）语义：
 *   - small  → 每 10 次调度取 5 次
 *   - medium → 每 10 次调度取 3 次
 *   - large  → 每 10 次调度取 2 次
 *
 * 若高优先级队列为空，则自动降级到次级队列，不浪费调度机会。
 */

import { InMemoryQueue } from "../queue/in-memory-queue";
import type { CrawlTaskSplit } from "./job-splitter";

export type QosLevel = "small" | "medium" | "large";

/** 调度比例权重（总和 = 10） */
const WEIGHTS: Record<QosLevel, number> = {
  small: 5,
  medium: 3,
  large: 2,
};

/** 调度轮次周期 */
const CYCLE = 10;

/** 优先级降级顺序 */
const FALLBACK_ORDER: QosLevel[] = ["small", "medium", "large"];

export class JobScheduler {
  private queues: Record<QosLevel, InMemoryQueue<CrawlTaskSplit>>;

  /** 当前轮次内每个级别已消耗的 token 数 */
  private tokens: Record<QosLevel, number>;

  /** 当前轮次已调度次数 */
  private cycleCount = 0;

  constructor() {
    this.queues = {
      small: new InMemoryQueue<CrawlTaskSplit>(),
      medium: new InMemoryQueue<CrawlTaskSplit>(),
      large: new InMemoryQueue<CrawlTaskSplit>(),
    };
    this.tokens = { small: 0, medium: 0, large: 0 };
  }

  /**
   * 按 QoS 等级提交子任务列表
   */
  schedule(tasks: CrawlTaskSplit[], qosClass: QosLevel): void {
    for (const task of tasks) {
      this.queues[qosClass].enqueue(task, task.task_id);
    }
  }

  /**
   * 公平轮询获取下一个任务
   * 按权重从对应级别队列取任务；若该级别为空则降级。
   * 全部为空时返回 null。
   */
  next(): CrawlTaskSplit | null {
    // 确定本次调度应优先取哪个级别
    const preferred = this._preferredLevel();

    // 按降级顺序尝试（从 preferred 级别开始）
    const order = this._levelOrder(preferred);
    for (const level of order) {
      const msg = this.queues[level].dequeue();
      if (msg) {
        this._consumeToken(level);
        return msg.payload;
      }
    }

    return null;
  }

  /**
   * 确认任务处理成功
   */
  ack(taskId: string, qosClass: QosLevel): void {
    this.queues[qosClass].ack(taskId);
  }

  /**
   * 标记任务处理失败（支持重试 / 死信）
   */
  nack(taskId: string, qosClass: QosLevel, error: Error): void {
    this.queues[qosClass].nack(taskId, error);
  }

  /**
   * 获取各级别队列统计信息
   */
  stats(): Record<QosLevel, { queued: number; processing: number; dead: number }> {
    return {
      small: {
        queued: this.queues.small.size(),
        processing: this.queues.small.processingSize(),
        dead: this.queues.small.getDeadLetters().length,
      },
      medium: {
        queued: this.queues.medium.size(),
        processing: this.queues.medium.processingSize(),
        dead: this.queues.medium.getDeadLetters().length,
      },
      large: {
        queued: this.queues.large.size(),
        processing: this.queues.large.processingSize(),
        dead: this.queues.large.getDeadLetters().length,
      },
    };
  }

  /**
   * 将各级别死信重新入队
   */
  requeueDeadLetters(): Record<QosLevel, number> {
    return {
      small: this.queues.small.requeueDeadLetters(),
      medium: this.queues.medium.requeueDeadLetters(),
      large: this.queues.large.requeueDeadLetters(),
    };
  }

  // ── 私有辅助 ─────────────────────────────────────────────

  /** 根据 token 计数器决定本次应从哪个级别取任务 */
  private _preferredLevel(): QosLevel {
    for (const level of FALLBACK_ORDER) {
      if (this.tokens[level] < WEIGHTS[level]) {
        return level;
      }
    }
    // 当前轮次所有 token 已用尽，重置计数器
    this._resetCycle();
    return "small";
  }

  /** 消耗一个 token，并在轮次结束时重置 */
  private _consumeToken(level: QosLevel): void {
    this.tokens[level] += 1;
    this.cycleCount += 1;
    if (this.cycleCount >= CYCLE) {
      this._resetCycle();
    }
  }

  private _resetCycle(): void {
    this.tokens = { small: 0, medium: 0, large: 0 };
    this.cycleCount = 0;
  }

  /**
   * 生成从 preferred 开始的降级顺序
   * 例：preferred = "medium" → ["medium", "large", "small"]（优先降级而非升级）
   */
  private _levelOrder(preferred: QosLevel): QosLevel[] {
    const idx = FALLBACK_ORDER.indexOf(preferred);
    const after = FALLBACK_ORDER.slice(idx);
    const before = FALLBACK_ORDER.slice(0, idx);
    return [...after, ...before];
  }
}
