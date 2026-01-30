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
 * 洞察子分类类型
 * v2.6.0 新增 - 基于 customer-feedback-analyzer skill
 */
export enum InsightSubType {
  BUG = "bug",
  PERFORMANCE = "performance",
  UX_ISSUE = "ux_issue",
  PRICING = "pricing",
  DOCUMENTATION = "documentation",
  INTEGRATION = "integration",
  WISH = "wish",
  GENERAL = "general"
}

/**
 * 反对意见类型
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 */
export enum ObjectionType {
  TRUST = "trust",
  SKEPTICISM = "skepticism",
  VALUE = "value",
  COMPLEXITY = "complexity",
  IDENTITY_MISMATCH = "identity_mismatch",
  RISK = "risk",
  PROCRASTINATION = "procrastination"
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
  // v2.5.0 字段
  trend?: InsightTrend;
  severity?: InsightSeverity;
  impactScore?: number;
  tags?: string[];
  relatedInsights?: string[];
  createdAt?: number;
  sourceTopics?: string[];
  // v2.6.0 新增字段
  subType?: InsightSubType;
  priority?: number | PriorityResult;
  urgency?: number;
  identitySignals?: string[];
  objections?: ObjectionType[];
  isWish?: boolean;
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

/**
 * 产品吸引力评分接口
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 */
export interface AppealScore {
  /**
   * 身份契合度 (0-10)
   */
  identityFit: number;
  /**
   * 问题紧急度 (0-10)
   */
  problemUrgency: number;
  /**
   * 信任信号 (0-10)
   */
  trustSignals: number;
  /**
   * 综合评分 (平均值)
   */
  overall: number;
  /**
   * 改进建议列表
   */
  recommendations: string[];
  /**
   * 目标用户画像信号
   */
  targetPersonas: string[];
  /**
   * 检测到的反对意见
   */
  objections: {
    type: ObjectionType;
    count: number;
    examples: string[];
  }[];
}

/**
 * 优先级计算参数
 * v2.6.0 新增 - 基于 customer-feedback-analyzer skill
 */
export interface PriorityCalculationParams {
  /**
   * 影响力 = 评论数 × 情感强度
   */
  impact: number;
  /**
   * 频率（置信度）
   */
  frequency: number;
  /**
   * 紧急度 (0-1)
   */
  urgency: number;
  /**
   * 实施难度 (1-10，默认5)
   */
  effort: number;
}

/**
 * 优先级计算结果
 */
export interface PriorityResult {
  /**
   * 优先级分数
   */
  score: number;
  /**
   * 优先级等级
   */
  level: "critical" | "high" | "medium" | "low";
  /**
   * 计算参数
   */
  params: PriorityCalculationParams;
  /**
   * 建议行动
   */
  recommendedAction: string;
}

// ==================== Reddit API 原始响应类型 ====================
// v2.7.0 新增 - 用于替换 any 类型

/**
 * Reddit API 列表响应
 */
export interface RedditListingResponse {
  kind: 'Listing';
  data: {
    after: string | null;
    before: string | null;
    dist: number | null;
    modhash: string;
    geo_filter: string;
    children: RedditChild[];
  };
}

/**
 * Reddit 列表项
 */
export interface RedditChild {
  kind: 't1' | 't2' | 't3' | 't4' | 't5' | 't6';
  data: RedditPostData | RedditCommentData | RedditSubredditData;
}

/**
 * Reddit 帖子数据
 */
export interface RedditPostData {
  id: string;
  name: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created: number;
  created_utc: number;
  subreddit: string;
  subreddit_id: string;
  subreddit_name_prefixed: string;
  permalink: string;
  url: string;
  is_self: boolean;
  over_18: boolean;
  spoiler: boolean;
  locked: boolean;
  stickied: boolean;
  archived: boolean;
  distinguished: string | null;
  link_flair_text: string | null;
  link_flair_css_class: string | null;
  author_flair_text: string | null;
  thumbnail: string;
  domain: string;
}

/**
 * Reddit 评论数据
 */
export interface RedditCommentData {
  id: string;
  name: string;
  author: string;
  body: string;
  body_html: string;
  score: number;
  ups: number;
  downs: number;
  created: number;
  created_utc: number;
  parent_id: string;
  link_id: string;
  subreddit: string;
  subreddit_id: string;
  permalink: string;
  depth: number;
  is_submitter: boolean;
  stickied: boolean;
  distinguished: string | null;
  edited: boolean | number;
  replies: RedditListingResponse | string;
}

/**
 * Reddit Subreddit 数据
 */
export interface RedditSubredditData {
  id: string;
  name: string;
  display_name: string;
  display_name_prefixed: string;
  title: string;
  description: string;
  description_html: string;
  public_description: string;
  subscribers: number;
  accounts_active: number | null;
  created: number;
  created_utc: number;
  url: string;
  icon_img: string;
  banner_img: string;
  header_img: string | null;
  over18: boolean;
  lang: string;
  subreddit_type: 'public' | 'private' | 'restricted' | 'gold_restricted' | 'archived';
}

/**
 * Reddit 搜索响应
 */
export interface RedditSearchResponse extends RedditListingResponse {
  data: RedditListingResponse['data'] & {
    children: Array<{
      kind: 't3' | 't5';
      data: RedditPostData | RedditSubredditData;
    }>;
  };
}

/**
 * Reddit 评论响应（帖子详情页返回的格式）
 */
export type RedditCommentsResponse = [
  RedditListingResponse,  // 帖子信息
  RedditListingResponse   // 评论列表
];

/**
 * Reddit API 错误响应
 */
export interface RedditErrorResponse {
  error: number;
  message: string;
  reason?: string;
}

/**
 * Worker 任务配置
 */
export interface WorkerTaskConfig {
  maxComments?: number;
  minKeywordLength?: number;
  topKeywordsCount?: number;
  sentimentThreshold?: number;
  enableInsightDetection?: boolean;
}
