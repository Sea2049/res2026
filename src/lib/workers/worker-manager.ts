/**
 * Web Worker 管理器
 * 统一管理 Worker 的创建、消息传递和清理
 * 
 * 注意：Worker 采用全局单例模式，不会在组件卸载时自动清理
 * 这样可以避免 Windows 系统下 libuv 的 UV_HANDLE_CLOSING 断言失败
 * 
 * v2.8.0 增强：
 * - 支持多任务类型（analyze, sentiment_only, keywords_only, batch_analyze）
 * - 支持大数据量分片并行处理
 */

import type { Comment, AnalysisConfig, AnalysisResult, KeywordCount, SentimentResult } from '../types';

/**
 * Worker 任务类型
 */
export type WorkerTaskType = 
  | 'analyze'           // 完整分析
  | 'sentiment_only'    // 仅情感分析
  | 'keywords_only'     // 仅关键词提取
  | 'batch_analyze';    // 批量分析（分片）

/**
 * Worker 任务状态
 */
export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
}

/**
 * Worker 任务接口
 */
interface WorkerTask<T> {
  id: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

/**
 * 分片配置
 */
interface ChunkConfig {
  /** 每个分片的评论数量 */
  chunkSize: number;
  /** 是否启用分片（评论数超过阈值时自动启用） */
  enableChunking: boolean;
  /** 启用分片的评论数阈值 */
  chunkThreshold: number;
}

/**
 * 默认分片配置
 */
const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 200,
  enableChunking: true,
  chunkThreshold: 500,
};

/**
 * NLP Worker 管理器
 */
export class NLPWorkerManager {
  private worker: Worker | null = null;
  private status: WorkerStatus = WorkerStatus.IDLE;
  private currentTask: WorkerTask<AnalysisResult> | null = null;
  private taskTimeout: number = 30000; // 30秒超时
  private retryCount: number = 0;
  private maxRetries: number = 2;
  private isTerminating: boolean = false; // 防止重复 terminate
  private idleTimer: NodeJS.Timeout | null = null; // 空闲清理计时器
  private readonly IDLE_CLEANUP_DELAY = 5 * 60 * 1000; // 5分钟空闲后清理

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    if (this.worker) {
      return;
    }

    try {
      // 重置 terminating 标志
      this.isTerminating = false;

      // 创建 Worker 实例
      this.worker = new Worker(
        new URL('./nlp.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // 监听 Worker 消息
      this.worker.addEventListener('message', this.handleWorkerMessage);
      // 监听 Worker 错误
      this.worker.addEventListener('error', this.handleWorkerError);

      this.status = WorkerStatus.IDLE;
    } catch (error) {
      console.error('Worker 初始化失败:', error);
      this.status = WorkerStatus.ERROR;
      throw new Error('无法初始化 Web Worker: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * 处理 Worker 返回的消息
   */
  private handleWorkerMessage = (event: MessageEvent): void => {
    if (!this.currentTask) {
      return;
    }

    const { type, result, error, progress } = event.data;

    if (type === 'result') {
      // 任务完成
      this.clearTaskTimeout();
      this.status = WorkerStatus.IDLE;
      this.currentTask.resolve(result);
      this.currentTask = null;
      this.retryCount = 0;
      
      // 启动空闲清理计时器
      this.startIdleCleanup();
    } else if (type === 'error') {
      // 任务失败
      this.clearTaskTimeout();
      this.handleError(new Error(error || 'Worker 执行失败'));
    } else if (type === 'progress') {
      // 进度更新（可以扩展为回调）
      console.debug('Worker 进度:', progress);
    }
  };
  
  /**
   * 启动空闲清理计时器
   */
  private startIdleCleanup(): void {
    // 清除之前的计时器
    this.cancelIdleCleanup();
    
    // 启动新的计时器：5分钟后清理
    this.idleTimer = setTimeout(() => {
      console.log('Worker 空闲超时，执行清理...');
      this.safeTerminate();
    }, this.IDLE_CLEANUP_DELAY);
  }
  
  /**
   * 取消空闲清理计时器
   */
  private cancelIdleCleanup(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError = (error: ErrorEvent): void => {
    console.error('Worker 错误:', error);
    this.handleError(new Error(`Worker 运行时错误: ${error.message}`));
  };

  /**
   * 清除任务超时
   */
  private clearTaskTimeout(): void {
    if (this.currentTask?.timeout) {
      clearTimeout(this.currentTask.timeout);
      this.currentTask.timeout = undefined;
    }
  }

  /**
   * 处理错误和重试
   */
  private handleError(error: Error): void {
    this.clearTaskTimeout();

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.warn(`Worker 任务失败，进行第 ${this.retryCount} 次重试...`);

      // 保存当前任务
      const task = this.currentTask;
      this.currentTask = null;

      // 不要 terminate，只是标记状态并通知外部重试
      this.status = WorkerStatus.IDLE;

      // 延迟通知外部，让 Worker 有时间恢复
      setTimeout(() => {
        if (task) {
          task.reject(error);
        }
      }, 100);
    } else {
      // 超过最大重试次数
      this.status = WorkerStatus.ERROR;
      if (this.currentTask) {
        const task = this.currentTask;
        this.currentTask = null;
        task.reject(new Error(`Worker 任务失败（已重试 ${this.maxRetries} 次）: ${error.message}`));
      }
      
      // 错误次数过多时，才考虑清理 Worker
      console.warn('Worker 多次失败，将在下次使用时重新初始化');
      this.safeTerminate();
    }
  }

  /**
   * 执行 NLP 分析任务
   * @param comments 评论数组
   * @param config 分析配置
   * @param timeout 超时时间（毫秒），默认 30 秒
   * @returns 分析结果
   */
  public async execute<T = AnalysisResult>(
    comments: Comment[],
    config: Partial<AnalysisConfig>,
    timeout?: number
  ): Promise<T> {
    return this.executeTask<T>('analyze', comments, config, timeout);
  }

  /**
   * 执行指定类型的任务
   * @param taskType 任务类型
   * @param comments 评论数组
   * @param config 分析配置
   * @param timeout 超时时间
   */
  public async executeTask<T>(
    taskType: WorkerTaskType,
    comments: Comment[],
    config: Partial<AnalysisConfig>,
    timeout?: number
  ): Promise<T> {
    // 取消空闲清理（因为即将使用 Worker）
    this.cancelIdleCleanup();
    
    // 确保 Worker 已初始化
    if (!this.worker || this.status === WorkerStatus.ERROR) {
      this.initializeWorker();
    }

    // 如果 Worker 忙碌，等待
    if (this.status === WorkerStatus.BUSY) {
      throw new Error('Worker 正在处理其他任务，请稍后再试');
    }

    // 设置超时时间
    const taskTimeout = timeout || this.taskTimeout;

    return new Promise<T>((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 设置任务超时
      const timeoutHandle = setTimeout(() => {
        if (this.currentTask?.id === taskId) {
          this.status = WorkerStatus.ERROR;
          this.currentTask?.reject(new Error(`Worker 任务超时（${taskTimeout}ms）`));
          this.currentTask = null;
        }
      }, taskTimeout);

      // 创建任务
      this.currentTask = {
        id: taskId,
        resolve,
        reject,
        timeout: timeoutHandle,
      };

      // 更新状态
      this.status = WorkerStatus.BUSY;

      // 发送消息到 Worker
      if (this.worker) {
        this.worker.postMessage({
          type: taskType,
          comments,
          config,
        });
      }
    });
  }

  /**
   * 仅执行情感分析
   * @param comments 评论数组
   * @param timeout 超时时间
   */
  public async analyzeSentimentOnly(
    comments: Comment[],
    timeout?: number
  ): Promise<{ positive: number; negative: number; neutral: number }> {
    return this.executeTask('sentiment_only', comments, {}, timeout);
  }

  /**
   * 仅提取关键词
   * @param comments 评论数组
   * @param config 关键词配置
   * @param timeout 超时时间
   */
  public async extractKeywordsOnly(
    comments: Comment[],
    config: Pick<AnalysisConfig, 'minKeywordLength' | 'topKeywordsCount'>,
    timeout?: number
  ): Promise<Array<{ word: string; count: number }>> {
    return this.executeTask('keywords_only', comments, config, timeout);
  }

  /**
   * 分片并行分析（用于大数据量）
   * 将数据分成多个分片，依次处理后合并结果
   * @param comments 评论数组
   * @param config 分析配置
   * @param chunkConfig 分片配置
   * @param timeout 超时时间
   */
  public async executeWithChunking(
    comments: Comment[],
    config: Partial<AnalysisConfig>,
    chunkConfig: Partial<ChunkConfig> = {},
    timeout?: number
  ): Promise<AnalysisResult> {
    const finalChunkConfig = { ...DEFAULT_CHUNK_CONFIG, ...chunkConfig };
    
    // 如果评论数量低于阈值，直接执行普通分析
    if (!finalChunkConfig.enableChunking || comments.length < finalChunkConfig.chunkThreshold) {
      return this.execute<AnalysisResult>(comments, config, timeout);
    }

    console.log(`启用分片处理: ${comments.length} 条评论，分片大小: ${finalChunkConfig.chunkSize}`);

    // 分片
    const chunks = this.splitIntoChunks(comments, finalChunkConfig.chunkSize);
    const chunkResults: AnalysisResult[] = [];

    // 依次处理每个分片
    for (let i = 0; i < chunks.length; i++) {
      console.log(`处理分片 ${i + 1}/${chunks.length}...`);
      const chunkResult = await this.execute<AnalysisResult>(chunks[i], config, timeout);
      chunkResults.push(chunkResult);
    }

    // 合并结果
    return this.mergeChunkResults(chunkResults);
  }

  /**
   * 将数组分割成多个分片
   */
  private splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 合并多个分片的分析结果
   */
  private mergeChunkResults(results: AnalysisResult[]): AnalysisResult {
    if (results.length === 0) {
      throw new Error('No chunk results to merge');
    }

    if (results.length === 1) {
      return results[0];
    }

    // 合并关键词（按词聚合计数，重新排序）
    const keywordMap = new Map<string, KeywordCount>();
    for (const result of results) {
      for (const kw of result.keywords) {
        const existing = keywordMap.get(kw.word);
        if (existing) {
          existing.count += kw.count;
          if (kw.tfidf) {
            existing.tfidf = (existing.tfidf || 0) + kw.tfidf;
          }
        } else {
          keywordMap.set(kw.word, { ...kw });
        }
      }
    }
    const mergedKeywords = Array.from(keywordMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    // 合并情感统计
    const mergedSentiment: SentimentResult = {
      positive: 0,
      negative: 0,
      neutral: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      neutralPercentage: 0,
    };
    for (const result of results) {
      mergedSentiment.positive += result.sentiment.positive;
      mergedSentiment.negative += result.sentiment.negative;
      mergedSentiment.neutral += result.sentiment.neutral;
    }
    const total = mergedSentiment.positive + mergedSentiment.negative + mergedSentiment.neutral;
    if (total > 0) {
      mergedSentiment.positivePercentage = Math.round((mergedSentiment.positive / total) * 100);
      mergedSentiment.negativePercentage = Math.round((mergedSentiment.negative / total) * 100);
      mergedSentiment.neutralPercentage = Math.round((mergedSentiment.neutral / total) * 100);
    }

    // 合并洞察（去重并按置信度排序）
    const insightMap = new Map<string, typeof results[0]['insights'][0]>();
    for (const result of results) {
      for (const insight of result.insights) {
        const key = `${insight.type}:${insight.title}`;
        const existing = insightMap.get(key);
        if (!existing || insight.confidence > existing.confidence) {
          insightMap.set(key, { 
            ...insight,
            relatedComments: [
              ...(existing?.relatedComments || []),
              ...insight.relatedComments
            ]
          });
        }
      }
    }
    const mergedInsights = Array.from(insightMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50);

    // 合并评论（保持去重）
    const commentSet = new Set<string>();
    const mergedComments = [];
    for (const result of results) {
      for (const comment of result.comments) {
        if (!commentSet.has(comment.id)) {
          commentSet.add(comment.id);
          mergedComments.push(comment);
        }
      }
    }

    return {
      keywords: mergedKeywords,
      sentiment: mergedSentiment,
      insights: mergedInsights,
      comments: mergedComments,
    };
  }

  /**
   * 取消当前任务
   */
  public cancel(): void {
    if (this.currentTask) {
      this.clearTaskTimeout();
      this.currentTask.reject(new Error('任务被用户取消'));
      this.currentTask = null;
      this.status = WorkerStatus.IDLE;
    }
  }

  /**
   * 安全终止 Worker（延迟执行，避免 libuv 冲突）
   * @private
   */
  private safeTerminate(): void {
    // 防止重复 terminate
    if (this.isTerminating || !this.worker) {
      return;
    }

    // 如果正在忙碌，延迟清理
    if (this.status === WorkerStatus.BUSY) {
      console.log('Worker 忙碌中，延迟清理...');
      setTimeout(() => this.safeTerminate(), 1000);
      return;
    }

    this.isTerminating = true;

    try {
      // 取消当前任务
      this.cancel();
      
      // 取消空闲清理计时器
      this.cancelIdleCleanup();

      // 使用 queueMicrotask 延迟执行，让事件循环完成
      queueMicrotask(() => {
        try {
          if (this.worker) {
            // 移除事件监听器
            this.worker.removeEventListener('message', this.handleWorkerMessage);
            this.worker.removeEventListener('error', this.handleWorkerError);

            // 终止 Worker
            this.worker.terminate();
            this.worker = null;
          }

          this.status = WorkerStatus.IDLE;
          this.retryCount = 0;
        } catch (error) {
          console.error('Worker terminate 失败:', error);
        } finally {
          this.isTerminating = false;
        }
      });
    } catch (error) {
      console.error('Worker 清理失败:', error);
      this.isTerminating = false;
    }
  }

  /**
   * 终止 Worker（公共接口，不推荐调用）
   * @deprecated 请让 Worker 自动管理生命周期，避免手动调用
   */
  public terminate(): void {
    console.warn('不建议手动调用 terminate()，Worker 会自动管理生命周期');
    // 不实际执行 terminate，只是取消当前任务
    this.cancel();
    this.cancelIdleCleanup();
  }

  /**
   * 获取当前状态
   */
  public getStatus(): WorkerStatus {
    return this.status;
  }

  /**
   * 设置任务超时时间
   */
  public setTaskTimeout(timeout: number): void {
    this.taskTimeout = timeout;
  }

  /**
   * 设置最大重试次数
   */
  public setMaxRetries(count: number): void {
    this.maxRetries = count;
  }
}

// 创建单例实例
let nlpWorkerManagerInstance: NLPWorkerManager | null = null;

/**
 * 获取 NLP Worker 管理器单例
 */
export function getNLPWorkerManager(): NLPWorkerManager {
  if (!nlpWorkerManagerInstance) {
    nlpWorkerManagerInstance = new NLPWorkerManager();
    
    // 只在浏览器环境且首次创建时，注册全局清理监听
    if (typeof window !== 'undefined') {
      // 页面卸载时清理（仅在真正离开页面时）
      window.addEventListener('beforeunload', () => {
        if (nlpWorkerManagerInstance) {
          console.log('页面卸载，清理 Worker...');
          nlpWorkerManagerInstance['safeTerminate']();
        }
      });
      
      // 页面隐藏时开始空闲计时（切换标签时）
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && nlpWorkerManagerInstance) {
          console.log('页面隐藏，启动空闲清理计时...');
          nlpWorkerManagerInstance['startIdleCleanup']();
        } else if (!document.hidden && nlpWorkerManagerInstance) {
          console.log('页面显示，取消空闲清理计时');
          nlpWorkerManagerInstance['cancelIdleCleanup']();
        }
      });
    }
  }
  return nlpWorkerManagerInstance;
}

/**
 * 清理 NLP Worker 管理器单例（用于测试或重置）
 */
export function resetNLPWorkerManager(): void {
  if (nlpWorkerManagerInstance) {
    // 测试环境下可以直接清理
    nlpWorkerManagerInstance['safeTerminate']();
    nlpWorkerManagerInstance = null;
  }
}
