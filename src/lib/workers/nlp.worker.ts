import {
  analyzeComments as analyzeCommentsLib,
  extractKeywords,
  analyzeSentiment,
} from "../nlp";

// ==================== 任务类型定义 ====================

/**
 * Worker 任务类型
 */
export type WorkerTaskType = 
  | 'analyze'           // 完整分析
  | 'sentiment_only'    // 仅情感分析
  | 'keywords_only'     // 仅关键词提取
  | 'batch_analyze';    // 批量分析（分片）

/**
 * 评论数据结构
 */
interface CommentData {
  id: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  parent_id: string;
}

/**
 * 分析配置
 */
interface AnalysisConfig {
  maxComments: number;
  minKeywordLength: number;
  topKeywordsCount: number;
  sentimentThreshold: number;
  enableInsightDetection: boolean;
}

/**
 * Worker 输入消息
 */
interface WorkerMessage {
  type: WorkerTaskType;
  comments: CommentData[];
  config: AnalysisConfig;
  chunkIndex?: number;    // 分片索引（batch_analyze 时使用）
  totalChunks?: number;   // 总分片数（batch_analyze 时使用）
}

/**
 * Worker 输出消息
 */
interface WorkerResponse {
  type: 'result' | 'error' | 'progress' | 'chunk_result';
  result?: ReturnType<typeof analyzeCommentsLib>;
  keywords?: Array<{ word: string; count: number }>;
  sentiment?: { positive: number; negative: number; neutral: number };
  error?: string;
  progress?: number;
  chunkIndex?: number;
}

// ==================== 分析函数 ====================

/**
 * 完整分析
 */
function performFullAnalysis(comments: CommentData[], config: AnalysisConfig): ReturnType<typeof analyzeCommentsLib> {
  return analyzeCommentsLib(comments, config, (progress) => {
    const percentage = 10 + Math.round((progress.current / progress.total) * 80);
    self.postMessage({ type: 'progress', progress: percentage } as WorkerResponse);
  });
}

/**
 * 仅情感分析
 */
function performSentimentAnalysis(comments: CommentData[]): { positive: number; negative: number; neutral: number } {
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const comment of comments) {
    const sentiment = analyzeSentiment(comment.body);
    if (sentiment.score > 0.1) {
      positive++;
    } else if (sentiment.score < -0.1) {
      negative++;
    } else {
      neutral++;
    }
  }

  return { positive, negative, neutral };
}

/**
 * 仅关键词提取
 */
function performKeywordExtraction(
  comments: CommentData[], 
  config: AnalysisConfig
): Array<{ word: string; count: number }> {
  // 使用共享库的 extractKeywords，需要完整配置
  const fullConfig: AnalysisConfig = {
    maxComments: config.maxComments || 500,
    minKeywordLength: config.minKeywordLength || 3,
    topKeywordsCount: config.topKeywordsCount || 30,
    sentimentThreshold: config.sentimentThreshold || 0.3,
    enableInsightDetection: false, // 仅提取关键词，不检测洞察
  };
  return extractKeywords(comments as unknown as Parameters<typeof extractKeywords>[0], fullConfig);
}

/**
 * 分片分析（用于大数据量）
 */
function performChunkAnalysis(
  comments: CommentData[], 
  config: AnalysisConfig,
  chunkIndex: number
): ReturnType<typeof analyzeCommentsLib> {
  // 分片分析不发送进度（由主线程管理整体进度）
  return analyzeCommentsLib(comments, config);
}

// ==================== 消息处理 ====================

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, comments, config, chunkIndex, totalChunks } = event.data;

    // 发送开始进度
    self.postMessage({ type: 'progress', progress: 10 } as WorkerResponse);

    switch (type) {
      case 'analyze': {
        const result = performFullAnalysis(comments, config);
        self.postMessage({ type: 'progress', progress: 100 } as WorkerResponse);
        self.postMessage({ type: 'result', result } as WorkerResponse);
        break;
      }

      case 'sentiment_only': {
        self.postMessage({ type: 'progress', progress: 30 } as WorkerResponse);
        const sentiment = performSentimentAnalysis(comments);
        self.postMessage({ type: 'progress', progress: 100 } as WorkerResponse);
        self.postMessage({ type: 'result', sentiment } as WorkerResponse);
        break;
      }

      case 'keywords_only': {
        self.postMessage({ type: 'progress', progress: 30 } as WorkerResponse);
        const keywords = performKeywordExtraction(comments, config);
        self.postMessage({ type: 'progress', progress: 100 } as WorkerResponse);
        self.postMessage({ type: 'result', keywords } as WorkerResponse);
        break;
      }

      case 'batch_analyze': {
        // 分片分析 - 返回分片结果
        const chunkResult = performChunkAnalysis(comments, config, chunkIndex || 0);
        self.postMessage({ 
          type: 'chunk_result', 
          result: chunkResult,
          chunkIndex: chunkIndex,
        } as WorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in worker',
    } as WorkerResponse);
  }
});

export {};
