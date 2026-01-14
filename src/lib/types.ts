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
