/**
 * Reddit API 鐩稿叧绫诲瀷瀹氫箟
 */

/**
 * Subreddit 淇℃伅鎺ュ彛
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
 * Post 淇℃伅鎺ュ彛
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
 * Comment 淇℃伅鎺ュ彛
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
 * 甯︽儏鎰熸爣绛剧殑璇勮鎺ュ彛
 */
export interface SentimentComment extends Comment {
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  keywords: string[];
}

/**
 * 鎼滅储缁撴灉绫诲瀷
 */
export type SearchResult = Subreddit | Post;

/**
 * 采集统计（可选，供 UI 展示口径）
 */
export interface FetchStats {
  /** 目标可获取总数 */
  totalAvailable: number;
  /** 原始拉取数量 */
  rawFetched: number;
  /** 去重/归一化后数量 */
  uniqueNormalized: number;
  /** 实际参与分析的评论数 */
  analyzedComments: number;
  /** 未达目标的缺口 */
  completionGap: number;
  /** 数据来源：jobs | legacy */
  source: "jobs" | "legacy";
}

/**
 * 分析结果类型
 */
export interface AnalysisResult {
  keywords: KeywordCount[];
  sentiment: SentimentResult;
  insights: Insight[];
  comments: SentimentComment[];
  /** 采集统计（可选，供 UI 展示） */
  fetchStats?: FetchStats;
}

/**
 * 鍏抽敭璇嶇粺璁℃帴鍙? */
export interface KeywordCount {
  word: string;
  count: number;
  sentiment?: "positive" | "negative" | "neutral";
  tfidf?: number;
  documentFrequency?: number;
}

/**
 * 鎯呮劅鍒嗘瀽缁撴灉鎺ュ彛
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
 * 娲炲療瓒嬪娍绫诲瀷
 */
export type InsightTrend = "up" | "down" | "stable";

/**
 * 娲炲療涓ラ噸绋嬪害
 */
export type InsightSeverity = "low" | "medium" | "high" | "critical";

/**
 * 娲炲療瀛愬垎绫荤被鍨? * v2.6.0 鏂板 - 鍩轰簬 customer-feedback-analyzer skill
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
 * 鍙嶅鎰忚绫诲瀷
 * v2.6.0 鏂板 - 鍩轰簬 product-appeal-analyzer skill
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
 * 鐢ㄦ埛娲炲療鎺ュ彛
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
  // v2.5.0 瀛楁
  trend?: InsightTrend;
  severity?: InsightSeverity;
  impactScore?: number;
  tags?: string[];
  relatedInsights?: string[];
  createdAt?: number;
  sourceTopics?: string[];
  // v2.6.0 鏂板瀛楁
  subType?: InsightSubType;
  priority?: number | PriorityResult;
  urgency?: number;
  identitySignals?: string[];
  objections?: ObjectionType[];
  isWish?: boolean;
}

/**
 * 娲炲療瓒嬪娍鏁版嵁鐐? */
export interface InsightTrendDataPoint {
  timestamp: number;
  count: number;
  avgConfidence: number;
  sentiment: "positive" | "negative" | "neutral";
}

/**
 * 娲炲療瓒嬪娍缁撴灉
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
 * 娲炲療绛涢€夋潯浠? */
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
 * 娲炲療鎺掑簭閫夐」
 */
export interface InsightSortOption {
  field: "confidence" | "count" | "createdAt" | "impactScore";
  direction: "asc" | "desc";
}

/**
 * 鍒嗘瀽浼氳瘽鐘舵€佹帴鍙? */
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
 * 鍒嗘瀽閰嶇疆鎺ュ彛
 */
export interface AnalysisConfig {
  maxComments: number;
  minKeywordLength: number;
  topKeywordsCount: number;
  sentimentThreshold: number;
  enableInsightDetection: boolean;
}

/**
 * 榛樿鍒嗘瀽閰嶇疆
 */
export const defaultAnalysisConfig: AnalysisConfig = {
  maxComments: 500,
  minKeywordLength: 3,
  topKeywordsCount: 30,
  sentimentThreshold: 0.3,
  enableInsightDetection: true,
};

/**
 * 閿欒淇℃伅鎺ュ彛锛堢敤浜?UI 灞曠ず锛? */
export interface ErrorInfo {
  /**
   * 閿欒绫诲瀷
   */
  type: string;
  /**
   * 閿欒浠ｇ爜
   */
  code: string;
  /**
   * 鐢ㄦ埛鍙嬪ソ鐨勯敊璇秷鎭?   */
  userMessage: string;
  /**
   * 閿欒涓ラ噸绋嬪害
   */
  severity: 'low' | 'medium' | 'high';
  /**
   * 鎭㈠寤鸿
   */
  recoveryActions: Array<{
    label: string;
    description: string;
    autoRecoverable: boolean;
    autoRecoverDelay?: number;
  }>;
  /**
   * 鏄惁鍙互鑷姩閲嶈瘯
   */
  canRetry: boolean;
  /**
   * 寤鸿鐨勮嚜鍔ㄩ噸璇曞欢杩燂紙姣锛?   */
  retryDelay?: number;
}

/**
 * 鍒嗘瀽闃舵绫诲瀷
 */
export type AnalysisStage = "keywords" | "sentiment" | "insights";

/**
 * 鍒嗘瀽杩涘害鎺ュ彛
 */
export interface AnalysisProgress {
  /**
   * 褰撳墠鍒嗘瀽闃舵
   */
  stage: AnalysisStage;
  /**
   * 宸插鐞嗙殑鏁伴噺
   */
  current: number;
  /**
   * 鎬绘暟閲?   */
  total: number;
  /**
   * 杩涘害鎻忚堪淇℃伅
   */
  message: string;
}

/**
 * 鍒嗘瀽杩涘害鍥炶皟绫诲瀷
 */
export type AnalysisProgressCallback = (progress: AnalysisProgress) => void;

/**
 * 娣卞害娲炶鐢熸垚鐘舵€? */
export type DeepInsightStatus = "idle" | "loading" | "success" | "error";

/**
 * 娣卞害娲炶缁撴灉鎺ュ彛
 */
export interface DeepInsight {
  /**
   * 娲炶鍞竴鏍囪瘑
   */
  id: string;
  /**
   * 鐢熸垚鏃堕棿
   */
  createdAt: number;
  /**
   * 鍒嗘瀽涓婚鍒楄〃
   */
  topics: SearchResult[];
  /**
   * AI鐢熸垚鐨勬繁搴︽礊瑙佸唴瀹癸紙Markdown鏍煎紡锛?   */
  content: string;
  /**
   * 鍏抽敭鍙戠幇鎽樿
   */
  keyFindings: string[];
  /**
   * 琛屽姩寤鸿
   */
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
    difficulty: string;
  }>;
  /**
   * Token浣跨敤缁熻
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 娣卞害娲炶浼氳瘽鎺ュ彛
 */
export interface DeepInsightSession {
  /**
   * 浼氳瘽鍞竴鏍囪瘑
   */
  id: string;
  /**
   * 鐢熸垚鐘舵€?   */
  status: DeepInsightStatus;
  /**
   * 杩涘害鐧惧垎姣旓紙0-100锛?   */
  progress: number;
  /**
   * 褰撳墠姝ラ鎻忚堪
   */
  currentStep: string;
  /**
   * 娲炶缁撴灉
   */
  result: DeepInsight | null;
  /**
   * 閿欒淇℃伅
   */
  error: string | null;
  /**
   * 寮€濮嬫椂闂?   */
  createdAt: number;
  /**
   * 瀹屾垚鏃堕棿
   */
  completedAt: number | null;
}

/**
 * 浜у搧鍚稿紩鍔涜瘎鍒嗘帴鍙? * v2.6.0 鏂板 - 鍩轰簬 product-appeal-analyzer skill
 */
export interface AppealScore {
  /**
   * 韬唤濂戝悎搴?(0-10)
   */
  identityFit: number;
  /**
   * 闂绱ф€ュ害 (0-10)
   */
  problemUrgency: number;
  /**
   * 淇′换淇″彿 (0-10)
   */
  trustSignals: number;
  /**
   * 缁煎悎璇勫垎 (骞冲潎鍊?
   */
  overall: number;
  /**
   * 鏀硅繘寤鸿鍒楄〃
   */
  recommendations: string[];
  /**
   * 鐩爣鐢ㄦ埛鐢诲儚淇″彿
   */
  targetPersonas: string[];
  /**
   * 妫€娴嬪埌鐨勫弽瀵规剰瑙?   */
  objections: {
    type: ObjectionType;
    count: number;
    examples: string[];
  }[];
}

/**
 * 浼樺厛绾ц绠楀弬鏁? * v2.6.0 鏂板 - 鍩轰簬 customer-feedback-analyzer skill
 */
export interface PriorityCalculationParams {
  /**
   * 褰卞搷鍔?= 璇勮鏁?脳 鎯呮劅寮哄害
   */
  impact: number;
  /**
   * 棰戠巼锛堢疆淇″害锛?   */
  frequency: number;
  /**
   * 绱ф€ュ害 (0-1)
   */
  urgency: number;
  /**
   * 瀹炴柦闅惧害 (1-10锛岄粯璁?)
   */
  effort: number;
}

/**
 * 浼樺厛绾ц绠楃粨鏋? */
export interface PriorityResult {
  /**
   * 浼樺厛绾у垎鏁?   */
  score: number;
  /**
   * 浼樺厛绾х瓑绾?   */
  level: "critical" | "high" | "medium" | "low";
  /**
   * 璁＄畻鍙傛暟
   */
  params: PriorityCalculationParams;
  /**
   * 寤鸿琛屽姩
   */
  recommendedAction: string;
}

// ==================== Reddit API 鍘熷鍝嶅簲绫诲瀷 ====================
// v2.7.0 鏂板 - 鐢ㄤ簬鏇挎崲 any 绫诲瀷

/**
 * Reddit API 鍒楄〃鍝嶅簲
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
 * Reddit 鍒楄〃椤? */
export interface RedditChild {
  kind: 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 'more';
  data: RedditPostData | RedditCommentData | RedditSubredditData | RedditMoreData;
}

/**
 * Reddit 折叠评论占位符（kind: more）
 * children 为评论 id（不含 t1_ 前缀）
 */
export interface RedditMoreData {
  id: string;
  name: string;
  parent_id: string;
  depth: number;
  children: string[];
  count?: number;
}

/**
 * Reddit 甯栧瓙鏁版嵁
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
 * Reddit 璇勮鏁版嵁
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
 * Reddit Subreddit 鏁版嵁
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
 * Reddit 鎼滅储鍝嶅簲
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
 * Reddit 璇勮鍝嶅簲锛堝笘瀛愯鎯呴〉杩斿洖鐨勬牸寮忥級
 */
export type RedditCommentsResponse = [
  RedditListingResponse,  // 甯栧瓙淇℃伅
  RedditListingResponse   // 璇勮鍒楄〃
];

/**
 * Reddit API 閿欒鍝嶅簲
 */
export interface RedditErrorResponse {
  error: number;
  message: string;
  reason?: string;
}

/**
 * Worker 浠诲姟閰嶇疆
 */
export interface WorkerTaskConfig {
  maxComments?: number;
  minKeywordLength?: number;
  topKeywordsCount?: number;
  sentimentThreshold?: number;
  enableInsightDetection?: boolean;
}

// ==================== 鎵归噺閲囬泦 Job / Task 绫诲瀷 ====================
// v3.0.0 鏂板 - Browser Worker 鎵归噺閲囬泦鏋舵瀯

/** 鏁版嵁鏉ユ簮 */
export type DataSource = "reddit";

/** 浠诲姟鐘舵€?*/
export type JobStatus =
  | "queued"
  | "running"
  | "partial_success"
  | "completed"
  | "failed"
  | "cancelled"
  | "archived";

/** QoS 绛夌骇锛氭寜鐩爣璇勮鏁拌嚜鍔ㄥ綊涓€鍖栨垨鎵嬪姩鎸囧畾 */
export type QosClass = "small" | "medium" | "large" | "auto";

/** 鍒嗘瀽鑼冨洿锛氬叏閲?/ 閲囨牱 */
export type AnalysisScope = "full" | "sampled";

/** 浠诲姟浼樺厛绾?*/
export type JobPriority = "low" | "normal" | "high";

/** 閿欒鐮佹灇涓?*/
export type ErrorCode =
  | "INVALID_JOB_CONFIG"
  | "JOB_LIMIT_EXCEEDED"
  | "JOB_NOT_FOUND"
  | "JOB_ALREADY_FINISHED"
  | "RATE_LIMITED"
  | "WORKER_UNAVAILABLE"
  | "CHALLENGE_DETECTED"
  | "UPSTREAM_FORBIDDEN"
  | "UPSTREAM_TOO_MANY_REQUESTS";

/** 浠诲姟杩囨护鏉′欢 */
export interface JobFilters {
  subreddits?: string[];
  post_ids?: string[];
  time_range?: "hour" | "day" | "week" | "month" | "year" | "all";
  sort?: "hot" | "new" | "top" | "relevance";
}

/** 浠诲姟杩愯鏃堕€夐」 */
export interface JobRuntimeOptions {
  timeout_minutes?: number;
  max_retries?: number;
  proxy_strategy?: "none" | "pool" | "sticky";
}

/** 鍒涘缓鐖彇浠诲姟鐨勯厤缃?*/
export interface CrawlJobConfig {
  source: DataSource;
  target_comments: number;
  max_comments: number;
  analysis_scope: AnalysisScope;
  llm_sample_ratio?: number;
  qos_class?: QosClass;
  priority?: JobPriority;
  idempotency_key?: string;
  filters?: JobFilters;
  runtime?: JobRuntimeOptions;
}

/** 浠诲姟杩涘害蹇収 */
export interface CrawlJobProgress {
  raw_fetched: number;
  unique_normalized: number;
  analyzed_comments: number;
  completion_gap: number;
  duplicate_count: number;
  invalid_count: number;
}

/** 浠诲姟閿欒缁熻 */
export interface CrawlJobErrorStats {
  http_403_count: number;
  http_429_count: number;
  retry_count: number;
  last_error_code?: ErrorCode;
}

/** 浠诲姟鏃堕棿淇℃伅 */
export interface CrawlJobTiming {
  queued_at: string;
  started_at?: string;
  updated_at: string;
  finished_at?: string;
  elapsed_seconds: number;
}

/** 鐖彇浠诲姟瀹屾暣鐘舵€?*/
export interface CrawlJob {
  job_id: string;
  status: JobStatus;
  source: DataSource;
  target_comments: number;
  max_comments: number;
  analysis_scope: AnalysisScope;
  qos_class: Exclude<QosClass, "auto">;
  priority: JobPriority;
  progress: CrawlJobProgress;
  errors: CrawlJobErrorStats;
  timing: CrawlJobTiming;
  /** P0：可选 filters，用于 runner 确定抓取目标 */
  filters?: JobFilters;
}

/** API 閿欒璇︽儏椤?*/
export interface ApiErrorDetail {
  field?: string;
  rule: string;
  expected?: string;
  actual?: string;
}

/** API 閿欒鍝嶅簲浣?*/
export interface ApiErrorPayload {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: ApiErrorDetail[];
  };
  request_id: string;
}

/** 鍒涘缓浠诲姟璇锋眰浣擄紙涓?CrawlJobConfig 绛夊悓锛?*/
export type CreateCrawlJobRequest = CrawlJobConfig;

/** 鍒涘缓浠诲姟鎴愬姛鍝嶅簲 */
export interface CreateCrawlJobResponse {
  job_id: string;
  status: "queued";
  accepted_config: {
    target_comments: number;
    max_comments: number;
    analysis_scope: AnalysisScope;
    qos_class: Exclude<QosClass, "auto">;
    priority: JobPriority;
  };
  limits: {
    max_allowed_comments: 10000;
  };
  links: {
    self: string;
    results: string;
  };
}

/** 鑾峰彇浠诲姟鐘舵€佸搷搴旓紙绛夊悓浜?CrawlJob锛?*/
export type GetJobStatusResponse = CrawlJob;

/** 鑾峰彇浠诲姟缁撴灉鏌ヨ鍙傛暟 */
export interface JobResultsQuery {
  cursor?: string;
  limit?: number;
  view?: "summary" | "items";
  include_raw?: boolean;
}

/** 鍒嗘瀽姹囨€绘暟鎹?*/
export interface AnalysisSummary {
  analyzed_comments: number;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_keywords: string[];
  top_insight_types: Array<"pain_point" | "feature_request" | "objection" | string>;
  /** P0：可选，抓取口径 raw_fetched/unique_normalized/completion_gap */
  fetch_stats?: {
    raw_fetched: number;
    unique_normalized: number;
    analyzed_comments: number;
    completion_gap: number;
  };
  /** P0：可选，完整 NLP 分析结果（含 comments） */
  analysis_result?: AnalysisResult;
}

/** 鍗曟潯鍒嗘瀽缁撴灉椤?*/
export interface AnalysisItem {
  comment_id: string;
  subreddit: string;
  post_id: string;
  created_utc: number;
  analysis: {
    sentiment: "positive" | "neutral" | "negative";
    keywords: string[];
    insight_type: string;
    priority: "critical" | "high" | "medium" | "low";
  };
}

/** 鍒嗛〉淇℃伅 */
export interface PaginationInfo {
  next_cursor: string | null;
}

/** 鑾峰彇浠诲姟缁撴灉锛堟憳瑕佽鍥撅級鍝嶅簲 */
export interface GetJobResultsSummaryResponse {
  job_id: string;
  status: JobStatus;
  summary: AnalysisSummary;
  pagination: PaginationInfo;
}

/** 鑾峰彇浠诲姟缁撴灉锛堝垪琛ㄨ鍥撅級鍝嶅簲 */
export interface GetJobResultsItemsResponse {
  job_id: string;
  items: AnalysisItem[];
  pagination: PaginationInfo;
}

/** 获取任务结果（评论视图）响应 */
export interface GetJobResultsCommentsResponse {
  job_id: string;
  comments: SentimentComment[];
  pagination: PaginationInfo;
}

/** 鍙栨秷浠诲姟璇锋眰浣?*/
export interface CancelJobRequest {
  reason: "operator_request" | "timeout" | "budget_exceeded" | "other";
}

/** 鍙栨秷浠诲姟鍝嶅簲 */
export interface CancelJobResponse {
  job_id: string;
  status: "cancelled";
  cancelled_at: string;
  final_progress: Pick<CrawlJobProgress, "analyzed_comments" | "completion_gap">;
}

/** 鍐呴儴 Worker 鎶撳彇璇锋眰 */
export interface InternalFetchRequest {
  url: string;
  method: "GET";
  headers?: Record<string, string>;
  strategy_hints?: {
    prefer_http_first?: boolean;
    allow_browser_fallback?: boolean;
  };
  session_key?: string;
  proxy_profile?: string;
  timeout_ms?: number;
}

/** 鍐呴儴 Worker 鎶撳彇鍝嶅簲 */
export interface InternalFetchResponse {
  ok: boolean;
  status: number;
  strategy_used: "http_direct" | "http_proxy" | "browser_fallback";
  challenge_detected: boolean;
  latency_ms: number;
  json_body?: unknown;
  error_code?: ErrorCode;
  error_message?: string;
}