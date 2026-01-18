/**
 * Reddit API 相关类型定义
 */

/**
 * Subreddit 信息接口
 */
export interface Subreddit {
  id: string;
  name: string;
  display_name: string;
  title: string;
  description: string;
  subscriber_count: number;
  url: string;
}

/**
 * Post 信息接口
 */
export interface Post {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
}

/**
 * Comment 信息接口
 */
export interface Comment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  parent_id: string;
  subreddit?: string;
  link_id?: string;
  permalink?: string;
}

/**
 * 带情感标签的评论接口
 */
export interface SentimentComment extends Comment {
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  keywords: string[];
}

/**
 * 搜索结果类型
 */
export type SearchResult = Subreddit | Post;

/**
 * 分析结果类型
 */
export interface AnalysisResult {
  keywords: KeywordCount[];
  sentiment: SentimentResult;
  insights: Insight[];
  comments: SentimentComment[];
}

/**
 * 关键词统计接口
 */
export interface KeywordCount {
  word: string;
  count: number;
  sentiment?: "positive" | "negative" | "neutral";
  tfidf?: number;
  documentFrequency?: number;
}

/**
 * 情感分析结果接口
 */
export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
}

/**
 * 洞察趋势类型
 */
export type InsightTrend = "up" | "down" | "stable";

/**
 * 洞察严重程度
 */
export type InsightSeverity = "low" | "medium" | "high" | "critical";

/**
 * 用户洞察接口
 */
export interface Insight {
  id: string;
  type: "pain_point" | "feature_request" | "praise" | "question";
  title: string;
  description: string;
  confidence: number;
  relatedComments: string[];
  keyword?: string;
  count?: number;
  // 新增字段
  trend?: InsightTrend;
  severity?: InsightSeverity;
  impactScore?: number;
  tags?: string[];
  relatedInsights?: string[];
  createdAt?: number;
  sourceTopics?: string[];
}

/**
 * 洞察趋势数据点
 */
export interface InsightTrendDataPoint {
  timestamp: number;
  count: number;
  avgConfidence: number;
  sentiment: "positive" | "negative" | "neutral";
}

/**
 * 洞察趋势结果
 */
export interface InsightTrendResult {
  insightId: string;
  trend: InsightTrend;
  changePercentage: number;
  dataPoints: InsightTrendDataPoint[];
  prediction: {
    nextCount: number;
    confidence: number;
  };
}

/**
 * 洞察筛选条件
 */
export interface InsightFilter {
  types?: Array<Insight["type"]>;
  minConfidence?: number;
  maxConfidence?: number;
  keywords?: string[];
  trends?: InsightTrend[];
  severities?: InsightSeverity[];
  dateRange?: {
    start: number;
    end: number;
  };
}

/**
 * 洞察排序选项
 */
export interface InsightSortOption {
  field: "confidence" | "count" | "createdAt" | "impactScore";
  direction: "asc" | "desc";
}

/**
 * 分析会话状态接口
 */
export interface AnalysisSession {
  id: string;
  topics: SearchResult[];
  status: "idle" | "fetching" | "analyzing" | "completed" | "error";
  progress: number;
  currentStep: string;
  result: AnalysisResult | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

/**
 * 分析配置接口
 */
export interface AnalysisConfig {
  maxComments: number;
  minKeywordLength: number;
  topKeywordsCount: number;
  sentimentThreshold: number;
  enableInsightDetection: boolean;
}

/**
 * 默认分析配置
 */
export const defaultAnalysisConfig: AnalysisConfig = {
  maxComments: 500,
  minKeywordLength: 3,
  topKeywordsCount: 30,
  sentimentThreshold: 0.3,
  enableInsightDetection: true,
};

/**
 * 错误信息接口（用于 UI 展示）
 */
export interface ErrorInfo {
  /**
   * 错误类型
   */
  type: string;
  /**
   * 错误代码
   */
  code: string;
  /**
   * 用户友好的错误消息
   */
  userMessage: string;
  /**
   * 错误严重程度
   */
  severity: 'low' | 'medium' | 'high';
  /**
   * 恢复建议
   */
  recoveryActions: Array<{
    label: string;
    description: string;
    autoRecoverable: boolean;
    autoRecoverDelay?: number;
  }>;
  /**
   * 是否可以自动重试
   */
  canRetry: boolean;
  /**
   * 建议的自动重试延迟（毫秒）
   */
  retryDelay?: number;
}

/**
 * 分析阶段类型
 */
export type AnalysisStage = "keywords" | "sentiment" | "insights";

/**
 * 分析进度接口
 */
export interface AnalysisProgress {
  /**
   * 当前分析阶段
   */
  stage: AnalysisStage;
  /**
   * 已处理的数量
   */
  current: number;
  /**
   * 总数量
   */
  total: number;
  /**
   * 进度描述信息
   */
  message: string;
}

/**
 * 分析进度回调类型
 */
export type AnalysisProgressCallback = (progress: AnalysisProgress) => void;

/**
 * 深度洞见生成状态
 */
export type DeepInsightStatus = "idle" | "loading" | "success" | "error";

/**
 * 深度洞见结果接口
 */
export interface DeepInsight {
  /**
   * 洞见唯一标识
   */
  id: string;
  /**
   * 生成时间
   */
  createdAt: number;
  /**
   * 分析主题列表
   */
  topics: SearchResult[];
  /**
   * AI生成的深度洞见内容（Markdown格式）
   */
  content: string;
  /**
   * 关键发现摘要
   */
  keyFindings: string[];
  /**
   * 行动建议
   */
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
    difficulty: string;
  }>;
  /**
   * Token使用统计
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 深度洞见会话接口
 */
export interface DeepInsightSession {
  /**
   * 会话唯一标识
   */
  id: string;
  /**
   * 生成状态
   */
  status: DeepInsightStatus;
  /**
   * 进度百分比（0-100）
   */
  progress: number;
  /**
   * 当前步骤描述
   */
  currentStep: string;
  /**
   * 洞见结果
   */
  result: DeepInsight | null;
  /**
   * 错误信息
   */
  error: string | null;
  /**
   * 开始时间
   */
  createdAt: number;
  /**
   * 完成时间
   */
  completedAt: number | null;
}
