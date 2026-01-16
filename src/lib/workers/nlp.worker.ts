import {
  analyzeComments as analyzeCommentsLib,
} from "../nlp";

// 定义 Worker 消息类型
interface WorkerMessage {
  type: 'analyze';
  comments: Array<{
    id: string;
    body: string;
    author: string;
    score: number;
    created_utc: number;
    parent_id: string;
  }>;
  config: {
    maxComments: number;
    minKeywordLength: number;
    topKeywordsCount: number;
    sentimentThreshold: number;
    enableInsightDetection: boolean;
  };
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  result?: ReturnType<typeof analyzeCommentsLib>;
  error?: string;
  progress?: number;
}

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, comments, config } = event.data;

    if (type === 'analyze') {
      // 发送进度更新
      self.postMessage({
        type: 'progress',
        progress: 10,
      } as WorkerResponse);

      // 使用共享库执行分析
      // 注意：我们需要适配 analyzeComments 的参数或回调
      // analyzeComments(comments, config, onProgressCallback)
      
      const result = analyzeCommentsLib(comments, config, (progress) => {
        // 将库的进度回调转换为 Worker 消息
        // 假设 progress.current / progress.total 映射到 10-90%
        const percentage = 10 + Math.round((progress.current / progress.total) * 80);
        self.postMessage({
          type: 'progress',
          progress: percentage,
        } as WorkerResponse);
      });

      // 发送完成信号
      self.postMessage({
        type: 'progress',
        progress: 100,
      } as WorkerResponse);

      // 返回结果
      self.postMessage({
        type: 'result',
        result,
      } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in worker',
    } as WorkerResponse);
  }
});

export {};
