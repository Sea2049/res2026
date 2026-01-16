/**
 * Web Worker 管理器
 * 统一管理 Worker 的创建、消息传递和清理
 */

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
 * NLP Worker 管理器
 */
export class NLPWorkerManager {
  private worker: Worker | null = null;
  private status: WorkerStatus = WorkerStatus.IDLE;
  private currentTask: WorkerTask<any> | null = null;
  private taskTimeout: number = 30000; // 30秒超时
  private retryCount: number = 0;
  private maxRetries: number = 2;

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    if (this.worker) {
      return;
    }

    try {
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

      // 重新初始化 Worker 并重试
      this.terminate();
      this.initializeWorker();

      // 重新发送任务（需要在调用层面处理）
      if (this.currentTask) {
        const task = this.currentTask;
        this.currentTask = null;
        // 由外部重新调用 execute
        task.reject(error);
      }
    } else {
      // 超过最大重试次数
      this.status = WorkerStatus.ERROR;
      if (this.currentTask) {
        const task = this.currentTask;
        this.currentTask = null;
        task.reject(new Error(`Worker 任务失败（已重试 ${this.maxRetries} 次）: ${error.message}`));
      }
    }
  }

  /**
   * 执行 NLP 分析任务
   * @param comments 评论数组
   * @param config 分析配置
   * @param timeout 超时时间（毫秒），默认 30 秒
   * @returns 分析结果
   */
  public async execute<T = any>(
    comments: any[],
    config: any,
    timeout?: number
  ): Promise<T> {
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
          type: 'analyze',
          comments,
          config,
        });
      }
    });
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
   * 终止 Worker
   */
  public terminate(): void {
    this.cancel();

    if (this.worker) {
      this.worker.removeEventListener('message', this.handleWorkerMessage);
      this.worker.removeEventListener('error', this.handleWorkerError);
      this.worker.terminate();
      this.worker = null;
    }

    this.status = WorkerStatus.IDLE;
    this.retryCount = 0;
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
  }
  return nlpWorkerManagerInstance;
}

/**
 * 清理 NLP Worker 管理器单例（用于测试或重置）
 */
export function resetNLPWorkerManager(): void {
  if (nlpWorkerManagerInstance) {
    nlpWorkerManagerInstance.terminate();
    nlpWorkerManagerInstance = null;
  }
}
