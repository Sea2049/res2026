/**
 * 内存消息队列（开发阶段使用，生产可替换为 Redis/Bull）
 *
 * 设计要点：
 * - nack 时按 attempts 计算指数退避（base 2s，最大 5min）
 * - 超过 MAX_ATTEMPTS 次后入死信队列
 * - requeueDeadLetters() 支持手动重放
 */

const MAX_ATTEMPTS = 3;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60 * 1_000; // 5 分钟

export interface QueueMessage<T = unknown> {
  id: string;
  payload: T;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
}

function generateId(): string {
  return (
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : require("crypto").randomUUID()
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 计算指数退避延迟（ms），上限 MAX_RETRY_MS
 * delay = base * 2^(attempts - 1)，带抖动
 */
function calcRetryDelay(attempts: number, overrideMs?: number): number {
  if (overrideMs !== undefined) return Math.min(overrideMs, MAX_RETRY_MS);
  const exp = Math.pow(2, Math.max(attempts - 1, 0));
  const jitter = Math.random() * 1_000;
  return Math.min(BASE_RETRY_MS * exp + jitter, MAX_RETRY_MS);
}

export class InMemoryQueue<T = unknown> {
  private queue: QueueMessage<T>[] = [];
  private processing: Map<string, QueueMessage<T>> = new Map();
  private deadLetters: QueueMessage<T>[] = [];

  /**
   * 将消息入队，返回消息 ID
   */
  enqueue(payload: T, msgId?: string): string {
    const id = msgId ?? generateId();
    this.queue.push({ id, payload, attempts: 0 });
    return id;
  }

  /**
   * 取出一条可执行的消息（跳过还在退避窗口内的消息）
   * 返回 null 表示当前无可用消息
   */
  dequeue(): QueueMessage<T> | null {
    const now = Date.now();
    const idx = this.queue.findIndex((msg) => {
      if (!msg.nextRetryAt) return true;
      return new Date(msg.nextRetryAt).getTime() <= now;
    });
    if (idx === -1) return null;
    const [msg] = this.queue.splice(idx, 1);
    msg.lastAttemptAt = nowIso();
    msg.attempts += 1;
    this.processing.set(msg.id, msg);
    return msg;
  }

  /**
   * 确认消息处理成功，从 processing 中移除
   */
  ack(msgId: string): void {
    this.processing.delete(msgId);
  }

  /**
   * 标记消息处理失败
   * - 未超过最大重试次数：放回队列，附带退避延迟
   * - 超过最大重试次数：进入死信队列
   */
  nack(msgId: string, _error: Error, retryDelayMs?: number): void {
    const msg = this.processing.get(msgId);
    if (!msg) return;
    this.processing.delete(msgId);

    if (msg.attempts >= MAX_ATTEMPTS) {
      this.deadLetters.push(msg);
      return;
    }

    const delayMs = calcRetryDelay(msg.attempts, retryDelayMs);
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    this.queue.push({ ...msg, nextRetryAt });
  }

  /**
   * 将死信队列中的消息重新入队（重置重试次数）
   * 返回重新入队的消息数量
   */
  requeueDeadLetters(): number {
    const count = this.deadLetters.length;
    while (this.deadLetters.length > 0) {
      const msg = this.deadLetters.shift()!;
      this.queue.push({
        id: msg.id,
        payload: msg.payload,
        attempts: 0,
        nextRetryAt: undefined,
      });
    }
    return count;
  }

  /** 返回死信队列快照（只读副本） */
  getDeadLetters(): QueueMessage<T>[] {
    return [...this.deadLetters];
  }

  /** 等待处理的消息数 */
  size(): number {
    return this.queue.length;
  }

  /** 正在处理的消息数 */
  processingSize(): number {
    return this.processing.size;
  }
}
